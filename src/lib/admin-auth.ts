export type SupabaseAal = "aal1" | "aal2";

export type VerifiedSupabaseIdentity = {
  userId: string;
  aal: SupabaseAal;
  email?: string;
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function extractBearerToken(authorization: string | null | undefined): string {
  if (!authorization) throw new Error("Sign in is required");
  const match = authorization.match(/^Bearer ([^\s]+)$/i);
  if (!match?.[1] || match[1].split(".").length !== 3) {
    throw new Error("Your sign-in session is invalid");
  }
  return match[1];
}

function hasAuthenticatedAudience(value: unknown): boolean {
  return (
    value === "authenticated" ||
    (Array.isArray(value) && value.some((audience) => audience === "authenticated"))
  );
}

export function validateVerifiedSupabaseClaims(
  claims: Record<string, unknown>,
  supabaseUrl: string,
  nowSeconds = Math.floor(Date.now() / 1000),
): VerifiedSupabaseIdentity {
  const issuer = `${supabaseUrl.replace(/\/+$/, "")}/auth/v1`;
  if (
    claims["iss"] !== issuer ||
    !hasAuthenticatedAudience(claims["aud"]) ||
    claims["role"] !== "authenticated" ||
    claims["is_anonymous"] === true ||
    typeof claims["exp"] !== "number" ||
    !Number.isFinite(claims["exp"]) ||
    claims["exp"] <= nowSeconds ||
    typeof claims["sub"] !== "string" ||
    !UUID.test(claims["sub"]) ||
    (claims["aal"] !== "aal1" && claims["aal"] !== "aal2")
  ) {
    throw new Error("Your sign-in session is invalid");
  }

  return {
    userId: claims["sub"],
    aal: claims["aal"],
    ...(typeof claims["email"] === "string" ? { email: claims["email"] } : {}),
  };
}

export async function verifySupabaseIdentity(
  authorization: string | null | undefined,
  supabaseUrl: string,
  verifyToken: (token: string) => Promise<Record<string, unknown>>,
): Promise<{ identity: VerifiedSupabaseIdentity; token: string }> {
  const token = extractBearerToken(authorization);
  let claims: Record<string, unknown>;
  try {
    claims = await verifyToken(token);
  } catch {
    throw new Error("Your sign-in session is invalid");
  }
  return { identity: validateVerifiedSupabaseClaims(claims, supabaseUrl), token };
}
