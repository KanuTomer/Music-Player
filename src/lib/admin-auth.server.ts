import { getRequest } from "@tanstack/react-start/server";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import {
  extractBearerToken,
  verifySupabaseIdentity,
  type VerifiedSupabaseIdentity,
} from "./admin-auth";

function authConfiguration() {
  const url = process.env["SUPABASE_URL"];
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"];
  if (!url || !key) throw new Error("Admin authentication is unavailable");
  return { url, key };
}

export function requestAccessToken(): string {
  return extractBearerToken(getRequest()?.headers.get("authorization"));
}

export function createRequestSupabaseClient(token: string): SupabaseClient<Database> {
  const { url, key } = authConfiguration();
  return createClient<Database>(url, key, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false, storage: undefined },
  });
}

export async function verifyRequestSupabaseIdentity(): Promise<{
  identity: VerifiedSupabaseIdentity;
  token: string;
  client: SupabaseClient<Database>;
}> {
  const authorization = getRequest()?.headers.get("authorization");
  const token = extractBearerToken(authorization);
  const client = createRequestSupabaseClient(token);
  const { url } = authConfiguration();
  const verified = await verifySupabaseIdentity(authorization, url, async (accessToken) => {
    const { data, error } = await client.auth.getClaims(accessToken);
    if (error || !data?.claims) throw error ?? new Error("Missing verified claims");
    return data.claims as unknown as Record<string, unknown>;
  });
  return { identity: verified.identity, token: verified.token, client };
}
