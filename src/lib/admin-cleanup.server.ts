import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { adminStorage } from "./admin-storage.server";
import { processCleanupBatch, resolveCleanupBackend } from "./admin-cleanup";

const MAX_OBJECTS_PER_RUN = 100;
const CHAT_BATCH_SIZE = 200;
const CHAT_MAX_PER_RUN = 1000;

async function purgeExpiredChat() {
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  let deleted = 0;
  while (deleted < CHAT_MAX_PER_RUN) {
    const { data, error } = await supabaseAdmin
      .from("chat_messages")
      .select("id")
      .lt("expires_at", cutoff)
      .order("expires_at")
      .limit(Math.min(CHAT_BATCH_SIZE, CHAT_MAX_PER_RUN - deleted));
    if (error) throw new Error(error.message);
    const ids = (data ?? []).map((row) => row.id);
    if (!ids.length) break;
    const { error: deleteError } = await supabaseAdmin.from("chat_messages").delete().in("id", ids);
    if (deleteError) throw new Error(deleteError.message);
    deleted += ids.length;
    if (ids.length < CHAT_BATCH_SIZE) break;
  }
  return deleted;
}

export async function runAdminCleanup() {
  const backend = resolveCleanupBackend();
  const repository =
    backend === "neon"
      ? (await import("./admin-cleanup.neon.server")).neonCleanupRepository
      : (await import("./admin-cleanup.supabase.server")).supabaseCleanupRepository;
  const storageResult = await processCleanupBatch(repository, adminStorage, MAX_OBJECTS_PER_RUN);
  const chatDeleted = await purgeExpiredChat();
  return {
    backend,
    ...storageResult,
    queued: storageResult.claimed,
    chatDeleted,
  };
}
