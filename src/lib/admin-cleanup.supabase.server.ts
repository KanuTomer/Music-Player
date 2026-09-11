import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { getCleanupReferenceStatus, type CleanupRepository } from "./admin-cleanup";

export const supabaseCleanupRepository: CleanupRepository = {
  async runRetention() {
    const { data, error } = await supabaseAdmin.rpc("admin_run_retention");
    if (error) throw new Error(error.message);
    return data?.[0] ?? null;
  },
  async claim(limit) {
    const { data, error } = await supabaseAdmin
      .from("admin_storage_cleanup_queue")
      .select("id,bucket,object_path,attempts")
      .is("completed_at", null)
      .lte("available_at", new Date().toISOString())
      .order("created_at")
      .limit(limit);
    if (error) throw new Error(error.message);
    return (data ?? []).map((item) => ({
      id: item.id,
      bucket: item.bucket,
      objectPath: item.object_path,
      attempts: item.attempts,
    }));
  },
  referenceStatus(item) {
    return getCleanupReferenceStatus(supabaseAdmin, {
      bucket: item.bucket,
      objectPath: item.objectPath,
    });
  },
  async complete(item, result) {
    const { error } = await supabaseAdmin
      .from("admin_storage_cleanup_queue")
      .update({
        completed_at: new Date().toISOString(),
        last_error: result === "removed" ? null : result,
      })
      .eq("id", item.id)
      .is("completed_at", null);
    if (error) throw new Error(error.message);
    if (result === "removed") {
      const { error: reservationError } = await supabaseAdmin
        .from("admin_upload_reservations")
        .update({ discarded_at: new Date().toISOString() })
        .eq("object_path", item.objectPath)
        .is("finalized_at", null);
      if (reservationError) throw new Error(reservationError.message);
    }
  },
  async retry(item, reason, delayMinutes) {
    const { error } = await supabaseAdmin
      .from("admin_storage_cleanup_queue")
      .update({
        attempts: item.attempts + 1,
        available_at: new Date(Date.now() + delayMinutes * 60_000).toISOString(),
        last_error: reason.slice(0, 120),
      })
      .eq("id", item.id)
      .is("completed_at", null);
    if (error) throw new Error(error.message);
  },
};
