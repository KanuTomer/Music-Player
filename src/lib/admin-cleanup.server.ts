import { sql } from "drizzle-orm";
import { db } from "@/db/client.server";
import { adminStorage } from "./admin-storage.server";
import { processCleanupBatch } from "./admin-cleanup";
import { neonCleanupRepository } from "./admin-cleanup.neon.server";

const MAX_OBJECTS_PER_RUN = 100;
const CHAT_BATCH_SIZE = 200;
const CHAT_MAX_PER_RUN = 1000;

async function purgeExpiredChat() {
  const result = await db.execute(sql`with expired as (
      select id from chat_messages
      where expires_at < now() - interval '24 hours'
      order by expires_at
      limit ${Math.min(CHAT_BATCH_SIZE, CHAT_MAX_PER_RUN)}
    ) delete from chat_messages c using expired where c.id=expired.id returning c.id`);
  return (result as { rows: unknown[] }).rows.length;
}

export async function runAdminCleanup() {
  const storageResult = await processCleanupBatch(
    neonCleanupRepository,
    adminStorage,
    MAX_OBJECTS_PER_RUN,
  );
  const chatDeleted = await purgeExpiredChat();
  return {
    backend: "neon" as const,
    ...storageResult,
    queued: storageResult.claimed,
    chatDeleted,
  };
}
