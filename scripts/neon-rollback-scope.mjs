import pg from "pg";

const knownActions = new Set([
  "ambience.asset.finalize",
  "ambience.profile.save",
  "ambience.stem.create",
  "ambience.stem.deactivate",
  "ambience.stem.update",
  "scene.presentation.save",
  "songs.bulk_add",
  "songs.bulk_remove",
  "songs.preview",
  "songs.update",
  "upload.discard",
  "upload.reserve",
]);

function requiredSince(argv) {
  const raw = argv.find((value) => value.startsWith("--since="))?.slice("--since=".length);
  if (!raw || Number.isNaN(Date.parse(raw))) {
    throw new Error("Pass a valid ISO timestamp with --since=<cutover timestamp>");
  }
  return new Date(raw).toISOString();
}

export function validateRollbackActions(actions) {
  const unknown = [...new Set(actions)].filter((action) => !knownActions.has(action)).sort();
  if (unknown.length) {
    throw new Error(`Unknown administrator audit actions: ${unknown.join(", ")}`);
  }
}

export async function collectRollbackScope(database, since) {
  const audit = await database.query(
    `select a.action, s.slug, count(*)::int as count
       from admin_audit_log a
       left join scenes s on s.id=a.scene_id
      where a.created_at >= $1::timestamptz
      group by a.action, s.slug
      order by a.action, s.slug`,
    [since],
  );
  validateRollbackActions(audit.rows.map((row) => row.action));

  const telemetry = await database.query(
    `select
         count(*) filter(where started_at >= $1::timestamptz or last_heartbeat_at >= $1::timestamptz)::int as visits,
         coalesce(sum(listening_seconds) filter(where started_at >= $1::timestamptz or last_heartbeat_at >= $1::timestamptz),0)::bigint as listening_seconds
       from room_visits`,
    [since],
  );
  const operational = await database.query(
    `select
         (select count(*)::int from playback_source_failures where last_seen_at >= $1::timestamptz) as source_failures,
         (select count(*)::int from admin_upload_reservations where created_at >= $1::timestamptz or finalized_at >= $1::timestamptz or discarded_at >= $1::timestamptz) as reservations,
         (select count(*)::int from admin_storage_cleanup_queue where created_at >= $1::timestamptz or completed_at >= $1::timestamptz or completed_at is null) as cleanup_rows`,
    [since],
  );
  const storage = await database.query(
    `with affected_scenes as (
         select distinct scene_id from admin_audit_log
          where created_at >= $1::timestamptz and scene_id is not null
       )
       select
         count(distinct s.background_storage_path) filter(where s.background_storage_path is not null)::int as backgrounds,
         count(distinct aa.storage_path)::int as ambience_objects
       from affected_scenes changed
       join scenes s on s.id=changed.scene_id
       left join sound_stems stem on stem.scene_id=s.id
       left join ambience_assets aa on aa.id=stem.asset_id`,
    [since],
  );

  return {
    since,
    audit: audit.rows,
    affectedScenes: [...new Set(audit.rows.map((row) => row.slug).filter(Boolean))].sort(),
    operational: {
      visits: Number(telemetry.rows[0]?.visits ?? 0),
      listeningSeconds: Number(telemetry.rows[0]?.listening_seconds ?? 0),
      sourceFailures: Number(operational.rows[0]?.source_failures ?? 0),
      reservations: Number(operational.rows[0]?.reservations ?? 0),
      cleanupRows: Number(operational.rows[0]?.cleanup_rows ?? 0),
    },
    referencedStorage: {
      backgrounds: Number(storage.rows[0]?.backgrounds ?? 0),
      ambienceObjects: Number(storage.rows[0]?.ambience_objects ?? 0),
    },
  };
}

async function main() {
  const since = requiredSince(process.argv.slice(2));
  const connectionString = process.env.DATABASE_URL_UNPOOLED;
  if (!connectionString) throw new Error("DATABASE_URL_UNPOOLED is required");

  const database = new pg.Client({ connectionString });
  await database.connect();
  try {
    console.log(JSON.stringify(await collectRollbackScope(database, since), null, 2));
  } finally {
    await database.end();
  }
}

if (import.meta.main) {
  await main();
}
