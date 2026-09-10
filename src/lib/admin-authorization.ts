import type { SupabaseAal, VerifiedSupabaseIdentity } from "./admin-auth";

export type AdminAuthorizationBackend = "supabase" | "neon";
export type AdminOnboardingStatus =
  "not_authorized" | "mfa_enrollment_required" | "mfa_challenge_required" | "ready";

export function resolveAdminAuthorizationBackend(
  value = process.env["ADMIN_AUTHORIZATION_BACKEND"],
): AdminAuthorizationBackend {
  if (value == null || value === "") return "supabase";
  if (value === "supabase" || value === "neon") return value;
  throw new Error("ADMIN_AUTHORIZATION_BACKEND must be either 'supabase' or 'neon'.");
}

export async function selectAdminAuthorizationRepository<T>(
  supabaseRepository: T,
  loadNeonRepository: () => Promise<T>,
  value = process.env["ADMIN_AUTHORIZATION_BACKEND"],
): Promise<T> {
  return resolveAdminAuthorizationBackend(value) === "neon"
    ? loadNeonRepository()
    : supabaseRepository;
}

export function neonOnboardingStatus(
  isAllowlisted: boolean,
  aal: SupabaseAal,
  nextAal?: SupabaseAal | null,
): AdminOnboardingStatus {
  if (!isAllowlisted) return "not_authorized";
  if (aal === "aal2") return "ready";
  return nextAal === "aal2" ? "mfa_challenge_required" : "mfa_enrollment_required";
}

export async function authorizeAdminIdentity(
  identity: { userId: string; aal: SupabaseAal },
  dependencies: {
    supabaseStatus: () => Promise<AdminOnboardingStatus>;
    loadNeonRepository: () => Promise<{ isAdmin: (userId: string) => Promise<boolean> }>;
    nextAal: () => Promise<SupabaseAal | null>;
  },
  value = process.env["ADMIN_AUTHORIZATION_BACKEND"],
): Promise<AdminOnboardingStatus> {
  if (resolveAdminAuthorizationBackend(value) === "supabase") {
    return dependencies.supabaseStatus();
  }
  const repository = await dependencies.loadNeonRepository();
  const isAllowlisted = await repository.isAdmin(identity.userId);
  if (!isAllowlisted || identity.aal === "aal2") {
    return neonOnboardingStatus(isAllowlisted, identity.aal);
  }
  return neonOnboardingStatus(isAllowlisted, identity.aal, await dependencies.nextAal());
}

export function requireReadyAdmin(
  identity: VerifiedSupabaseIdentity,
  status: AdminOnboardingStatus,
): VerifiedSupabaseIdentity {
  if (status === "not_authorized") throw new Error("Administrator access is required");
  if (status !== "ready") throw new Error("Administrator MFA verification is required");
  return identity;
}
