import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { publicStorageUrl } from "./public-storage.server";
import type { AdminStorageBucket } from "./admin-storage";

export const adminStorage = {
  publicUrl(bucket: AdminStorageBucket, path: string | null | undefined) {
    return publicStorageUrl(bucket, path);
  },
  async createSignedUploadUrl(bucket: AdminStorageBucket, path: string) {
    const { data, error } = await supabaseAdmin.storage.from(bucket).createSignedUploadUrl(path);
    if (error || !data) throw new Error(error?.message ?? "Unable to create signed upload URL");
    return { token: data.token };
  },
  async download(bucket: AdminStorageBucket, path: string) {
    const { data, error } = await supabaseAdmin.storage.from(bucket).download(path);
    if (error || !data) throw new Error(error?.message ?? "Uploaded object is missing");
    return Buffer.from(await data.arrayBuffer());
  },
  async remove(bucket: AdminStorageBucket, path: string) {
    const { error } = await supabaseAdmin.storage.from(bucket).remove([path]);
    if (error) throw new Error(error.message);
  },
};
