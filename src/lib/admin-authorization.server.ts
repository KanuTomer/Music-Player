import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { verifyRequestSupabaseIdentity } from "./admin-auth.server";
import type { VerifiedSupabaseIdentity } from "./admin-auth";
import {
  authorizeAdminIdentity,
  requireReadyAdmin,
  resolveAdminAuthorizationBackend,
  type AdminOnboardingStatus,
} from "./admin-authorization";

type NeonAuthorizationRepository = { isAdmin: (userId: string) => Promise<boolean> };

async function supabaseOnboardingStatus(
  client: SupabaseClient<Database>,
): Promise<AdminOnboardingStatus> {
  const { data, error } = await client.rpc("admin_onboarding_status");
  if (error) throw new Error("Unable to verify administrator access");
  return data as AdminOnboardingStatus;
}

async function loadNeonAuthorizationRepository(): Promise<NeonAuthorizationRepository> {
  const { neonAdminAuthorizationRepository } = await import("./admin-authorization.neon.server");
  return neonAdminAuthorizationRepository;
}

export async function getRequestAdminAuthorization(): Promise<{
  identity: VerifiedSupabaseIdentity;
  status: AdminOnboardingStatus;
}> {
  const verified = await verifyRequestSupabaseIdentity();
  const backend = resolveAdminAuthorizationBackend();
  const status = await authorizeAdminIdentity(
    verified.identity,
    {
      supabaseStatus: () => supabaseOnboardingStatus(verified.client),
      loadNeonRepository: loadNeonAuthorizationRepository,
      nextAal: async () => {
        const { data, error } = await verified.client.auth.mfa.getAuthenticatorAssuranceLevel(
          verified.token,
        );
        if (error) throw new Error("Unable to verify administrator MFA status");
        if (data.nextLevel === "aal2") return "aal2";
        if (data.nextLevel === "aal1") return "aal1";
        return null;
      },
    },
    backend,
  );
  return {
    identity: verified.identity,
    status,
  };
}

export async function requireRequestAdmin(): Promise<VerifiedSupabaseIdentity> {
  const authorization = await getRequestAdminAuthorization();
  return requireReadyAdmin(authorization.identity, authorization.status);
}
