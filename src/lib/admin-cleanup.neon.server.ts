import { sql } from "drizzle-orm";
import { db } from "@/db/client.server";
import type { CleanupReferenceStatus, CleanupRepository } from "./admin-cleanup";

const rows = <T>(result: unknown) => (result as { rows: T[] }).rows;

export const neonCleanupRepository: CleanupRepository = {
  async runRetention() {
    return db.transaction(async (tx) => {
      const queued = rows(
        await tx.execute(sql`insert into admin_storage_cleanup_queue(bucket,object_path,reason)
          select bucket,object_path,'expired_upload' from admin_upload_reservations
          where expires_at<=now() and finalized_at is null and discarded_at is null
          on conflict(bucket,object_path,reason) do nothing returning id`),
      ).length;
      const audits = rows(
        await tx.execute(
          sql`delete from admin_audit_log where created_at<now()-interval '180 days' returning id`,
        ),
      ).length;
      const rates = rows(
        await tx.execute(
          sql`delete from admin_rate_limits where window_started_at<now()-interval '2 days' returning actor_id`,
        ),
      ).length;
      return { expiredReservations: queued, deletedAuditRows: audits, deletedRateRows: rates };
    });
  },
  async claim(limit) {
    const claimed = rows<{
      id: string;
      bucket: string;
      object_path: string;
      attempts: number;
    }>(
      await db.execute(sql`with picked as (
        select id from admin_storage_cleanup_queue
        where completed_at is null and available_at<=now()
        order by created_at for update skip locked limit ${limit}
      ) update admin_storage_cleanup_queue q
        set available_at=now()+interval '10 minutes'
        from picked where q.id=picked.id
        returning q.id,q.bucket,q.object_path,q.attempts`),
    );
    return claimed.map((item) => ({
      id: item.id,
      bucket: item.bucket,
      objectPath: item.object_path,
      attempts: item.attempts,
    }));
  },
  async referenceStatus(item): Promise<CleanupReferenceStatus> {
    if (item.bucket !== "scene-media" && item.bucket !== "ambience-audio") return "unavailable";
    try {
      const result = rows<{ referenced: boolean }>(
        await db.execute(sql`select
          (${item.bucket}='scene-media' and exists(
            select 1 from scenes where background_storage_path=${item.objectPath}))
          or (${item.bucket}='ambience-audio' and exists(
            select 1 from ambience_assets where storage_path=${item.objectPath}))
          or exists(
            select 1 from admin_upload_reservations
            where bucket=${item.bucket} and object_path=${item.objectPath}
              and expires_at>now() and finalized_at is null and discarded_at is null)
          as referenced`),
      );
      return result[0]?.referenced ? "referenced" : "unreferenced";
    } catch {
      return "unavailable";
    }
  },
  async complete(item, result) {
    await db.transaction(async (tx) => {
      await tx.execute(sql`update admin_storage_cleanup_queue
        set completed_at=now(),last_error=${result === "removed" ? null : result}
        where id=${item.id}::uuid and completed_at is null`);
      if (result === "removed")
        await tx.execute(sql`update admin_upload_reservations set discarded_at=coalesce(discarded_at,now())
          where object_path=${item.objectPath} and finalized_at is null`);
    });
  },
  async retry(item, reason, delayMinutes) {
    await db.execute(sql`update admin_storage_cleanup_queue
      set attempts=attempts+1,available_at=now()+(${delayMinutes}::text||' minutes')::interval,
        last_error=${reason.slice(0, 120)}
      where id=${item.id}::uuid and completed_at is null`);
  },
};
