import { describe, expect, test } from "bun:test";
import {
  extractBearerToken,
  validateVerifiedSupabaseClaims,
  verifySupabaseIdentity,
} from "./admin-auth";

const URL = "https://project.supabase.co";
const TOKEN = "header.payload.signature";
const USER_ID = "f6adb0b3-5e24-4799-b008-2ff909e97e6e";

function claims(overrides: Record<string, unknown> = {}) {
  return {
    iss: `${URL}/auth/v1`,
    aud: "authenticated",
    exp: 2_000_000_000,
    sub: USER_ID,
    role: "authenticated",
    aal: "aal2",
    is_anonymous: false,
    email: "admin@example.invalid",
    ...overrides,
  };
}

describe("Supabase administrator JWT verification", () => {
  test("extracts exactly one non-empty bearer JWT", () => {
    expect(extractBearerToken(`Bearer ${TOKEN}`)).toBe(TOKEN);
    expect(extractBearerToken(`bearer ${TOKEN}`)).toBe(TOKEN);
    expect(() => extractBearerToken(null)).toThrow("Sign in is required");
    expect(() => extractBearerToken("Basic abc")).toThrow("session is invalid");
    expect(() => extractBearerToken("Bearer one.two")).toThrow("session is invalid");
    expect(() => extractBearerToken(`Bearer ${TOKEN} extra`)).toThrow("session is invalid");
  });

  test("accepts verified authenticated claims and an audience array", () => {
    expect(validateVerifiedSupabaseClaims(claims(), `${URL}/`, 1_900_000_000)).toEqual({
      userId: USER_ID,
      aal: "aal2",
      email: "admin@example.invalid",
    });
    expect(
      validateVerifiedSupabaseClaims(claims({ aud: ["other", "authenticated"] }), URL, 1),
    ).toMatchObject({ userId: USER_ID });
  });

  const rejectedClaims: Array<[string, Record<string, unknown>]> = [
    ["wrong issuer", { iss: "https://other.supabase.co/auth/v1" }],
    ["wrong audience", { aud: "anon" }],
    ["expired token", { exp: 100 }],
    ["missing subject", { sub: undefined }],
    ["invalid subject", { sub: "not-a-uuid" }],
    ["anonymous user", { is_anonymous: true }],
    ["non-authenticated role", { role: "service_role" }],
    ["unknown AAL", { aal: "aal3" }],
  ];

  test.each(rejectedClaims)("rejects %s", (_name: string, overrides: Record<string, unknown>) => {
    expect(() => validateVerifiedSupabaseClaims(claims(overrides), URL, 1_000)).toThrow(
      "session is invalid",
    );
  });

  test("does not accept claims when signature verification fails", async () => {
    await expect(
      verifySupabaseIdentity(`Bearer ${TOKEN}`, URL, async () => {
        throw new Error("bad signature");
      }),
    ).rejects.toThrow("session is invalid");
  });

  test("returns only trusted identity fields from verified claims", async () => {
    const result = await verifySupabaseIdentity(`Bearer ${TOKEN}`, URL, async () =>
      claims({ user_metadata: { userId: "attacker-controlled" } }),
    );
    expect(result).toEqual({
      token: TOKEN,
      identity: { userId: USER_ID, aal: "aal2", email: "admin@example.invalid" },
    });
  });
});
