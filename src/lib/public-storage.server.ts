import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let storageClient: SupabaseClient | undefined;

function getStorageClient() {
  if (storageClient) return storageClient;

  const url = process.env["SUPABASE_URL"];
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"];
  if (!url || !key) throw new Error("Public Storage configuration is unavailable");

  storageClient = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return storageClient;
}

export function publicStorageUrl(bucket: string, path: string | null | undefined) {
  if (!path) return null;
  return getStorageClient().storage.from(bucket).getPublicUrl(path).data.publicUrl;
}
