import { describe, expect, test } from "bun:test";
import {
  authorizeAdminIdentity,
  neonOnboardingStatus,
  requireReadyAdmin,
  resolveAdminAuthorizationBackend,
  selectAdminAuthorizationRepository,
} from "./admin-authorization";

const USER_ID = "f6adb0b3-5e24-4799-b008-2ff909e97e6e";

describe("administrator authorization routing", () => {
  test("defaults missing and empty values to Supabase and is case-sensitive", () => {
    expect(resolveAdminAuthorizationBackend(undefined)).toBe("supabase");
    expect(resolveAdminAuthorizationBackend("")).toBe("supabase");
    expect(resolveAdminAuthorizationBackend("supabase")).toBe("supabase");
    expect(resolveAdminAuthorizationBackend("neon")).toBe("neon");
    expect(() => resolveAdminAuthorizationBackend("Neon")).toThrow("ADMIN_AUTHORIZATION_BACKEND");
    expect(() => resolveAdminAuthorizationBackend("other")).toThrow("ADMIN_AUTHORIZATION_BACKEND");
  });

  test("does not load Neon when Supabase is selected", async () => {
    let neonLoads = 0;
    const supabaseRepository = { provider: "supabase" };
    const selected = await selectAdminAuthorizationRepository(
      supabaseRepository,
      async () => {
        neonLoads += 1;
        return { provider: "neon" };
      },
      "supabase",
    );
    expect(selected).toBe(supabaseRepository);
    expect(neonLoads).toBe(0);
  });

  test("loads Neon only when selected", async () => {
    let neonLoads = 0;
    const selected = await selectAdminAuthorizationRepository(
      { provider: "supabase" },
      async () => {
        neonLoads += 1;
        return { provider: "neon" };
      },
      "neon",
    );
    expect(selected.provider).toBe("neon");
    expect(neonLoads).toBe(1);
  });

  test("preserves all four onboarding states", () => {
    expect(neonOnboardingStatus(false, "aal2")).toBe("not_authorized");
    expect(neonOnboardingStatus(true, "aal2")).toBe("ready");
    expect(neonOnboardingStatus(true, "aal1", "aal2")).toBe("mfa_challenge_required");
    expect(neonOnboardingStatus(true, "aal1", "aal1")).toBe("mfa_enrollment_required");
  });

  test("Supabase fallback uses the existing status path without opening Neon", async () => {
    let neonLoads = 0;
    const status = await authorizeAdminIdentity(
      { userId: USER_ID, aal: "aal2" },
      {
        supabaseStatus: async () => "ready",
        loadNeonRepository: async () => {
          neonLoads += 1;
          return { isAdmin: async () => true };
        },
        nextAal: async () => "aal2",
      },
      "supabase",
    );
    expect(status).toBe("ready");
    expect(neonLoads).toBe(0);
  });

  test("denies a non-allowlisted AAL2 caller without checking MFA", async () => {
    let mfaChecks = 0;
    const status = await authorizeAdminIdentity(
      { userId: USER_ID, aal: "aal2" },
      {
        supabaseStatus: async () => "ready",
        loadNeonRepository: async () => ({ isAdmin: async () => false }),
        nextAal: async () => {
          mfaChecks += 1;
          return "aal2";
        },
      },
      "neon",
    );
    expect(status).toBe("not_authorized");
    expect(mfaChecks).toBe(0);
  });

  test("denies AAL1 and accepts an allowlisted AAL2 identity", async () => {
    const dependencies = {
      supabaseStatus: async () => "not_authorized" as const,
      loadNeonRepository: async () => ({ isAdmin: async () => true }),
      nextAal: async () => "aal2" as const,
    };
    expect(
      await authorizeAdminIdentity({ userId: USER_ID, aal: "aal1" }, dependencies, "neon"),
    ).toBe("mfa_challenge_required");
    expect(
      await authorizeAdminIdentity({ userId: USER_ID, aal: "aal2" }, dependencies, "neon"),
    ).toBe("ready");
  });

  test("blocks rejected callers before a protected operation can begin", () => {
    const identity = { userId: USER_ID, aal: "aal2" as const };
    expect(() => requireReadyAdmin(identity, "not_authorized")).toThrow(
      "Administrator access is required",
    );
    expect(() => requireReadyAdmin({ ...identity, aal: "aal1" }, "mfa_challenge_required")).toThrow(
      "Administrator MFA verification is required",
    );
    expect(requireReadyAdmin(identity, "ready")).toBe(identity);
  });
});
