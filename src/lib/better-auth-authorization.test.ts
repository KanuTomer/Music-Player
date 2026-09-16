import { describe, expect, test } from "bun:test";
import { classifyBetterAuthAdminSession } from "./better-auth-authorization";

describe("Better Auth administrator authorization", () => {
  const old = new Date("2026-09-15T10:00:00Z");
  const recent = new Date("2026-09-15T10:01:00Z");
  test("rejects missing and non-allowlisted sessions", () => {
    expect(classifyBetterAuthAdminSession({ hasSession: false, allowlisted: true, twoFactorEnabled: true })).toBe("not_authorized");
    expect(classifyBetterAuthAdminSession({ hasSession: true, allowlisted: false, twoFactorEnabled: true })).toBe("not_authorized");
  });
  test("requires enrolment and a fresh post-TOTP session", () => {
    expect(classifyBetterAuthAdminSession({ hasSession: true, allowlisted: true, twoFactorEnabled: false })).toBe("mfa_enrollment_required");
    expect(classifyBetterAuthAdminSession({ hasSession: true, allowlisted: true, twoFactorEnabled: true, sessionCreatedAt: old, userUpdatedAt: recent })).toBe("mfa_challenge_required");
    expect(classifyBetterAuthAdminSession({ hasSession: true, allowlisted: true, twoFactorEnabled: true, sessionCreatedAt: recent, userUpdatedAt: old })).toBe("ready");
  });
});
