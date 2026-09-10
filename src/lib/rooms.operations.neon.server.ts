import { sql, type SQL } from "drizzle-orm";
import { playbackSourceFailures, roomVisits, scenes } from "@/db/schema";
import type { OperationalWriteRepository } from "./rooms.operations.server";

type OperationalDatabase = {
  execute: (query: SQL) => Promise<unknown>;
};

export function createNeonOperationalWriteRepository(
  database: OperationalDatabase,
): OperationalWriteRepository {
  return {
    async registerRoomVisit({ visitId, sceneSlug }) {
      await database.execute(sql`
        insert into ${roomVisits} ("id", "scene_id")
        select ${visitId}::uuid, ${scenes.id}
        from ${scenes}
        where ${scenes.slug} = ${sceneSlug} and ${scenes.isLive} = true
        on conflict ("id") do nothing
      `);
    },

    async recordListening({ visitId, sceneSlug, seconds }) {
      await database.execute(sql`
        update ${roomVisits}
        set "first_played_at" = coalesce(${roomVisits.firstPlayedAt}, now()),
            "last_heartbeat_at" = now(),
            "listening_seconds" = ${roomVisits.listeningSeconds} + ${seconds}
        where ${roomVisits.id} = ${visitId}::uuid
          and ${roomVisits.sceneId} = (
            select ${scenes.id}
            from ${scenes}
            where ${scenes.slug} = ${sceneSlug} and ${scenes.isLive} = true
          )
      `);
    },

    async recordSourceFailure({ sourceId, errorCode }) {
      await database.execute(sql`
        insert into ${playbackSourceFailures} (
          "source_id",
          "error_code"
        ) values (${sourceId}::uuid, ${errorCode})
        on conflict (
          "source_id",
          "error_code",
          "failed_on"
        ) do update
        set "occurrence_count" =
              ${playbackSourceFailures.occurrenceCount} + 1,
            "last_seen_at" = now()
      `);
      return { recorded: true };
    },
  };
}

export const neonOperationalWriteRepository = createNeonOperationalWriteRepository({
  async execute(query) {
    const { db } = await import("@/db/client.server");
    return db.execute(query);
  },
});
