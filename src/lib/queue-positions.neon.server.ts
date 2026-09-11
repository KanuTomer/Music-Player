import { sql, type SQL } from "drizzle-orm";

type Executor = { execute(query: SQL): Promise<unknown> };

/**
 * Close queue position gaps without transiently colliding with the queue's
 * non-deferrable unique position constraint.
 */
export async function normalizeQueuePositions(executor: Executor, queueId: string) {
  await executor.execute(sql`
    with bounds as (
      select coalesce(max(position), 0)::int + count(*)::int + 1 as offset
      from curated_set_tracks
      where curated_set_id=${queueId}::uuid
    )
    update curated_set_tracks membership
    set position=membership.position + bounds.offset
    from bounds
    where membership.curated_set_id=${queueId}::uuid
  `);

  await executor.execute(sql`
    with ranked as (
      select id, row_number() over(order by position, id)::int as position
      from curated_set_tracks
      where curated_set_id=${queueId}::uuid
    )
    update curated_set_tracks membership
    set position=ranked.position
    from ranked
    where membership.id=ranked.id
  `);
}
