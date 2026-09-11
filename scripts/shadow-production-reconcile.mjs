import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import pg from "pg";
import { APPROVED_TABLES, clientConfig, tableMetric } from "./shadow-production-export.mjs";

const { Client } = pg;

export function compareMetrics(expected, actual) {
  const mismatches = [];
  for (const table of APPROVED_TABLES) {
    if (!expected[table] || !actual[table]) {
      mismatches.push(`${table}: missing metric`);
      continue;
    }
    for (const field of ["count", "sha256"]) {
      if (expected[table][field] !== actual[table][field]) {
        mismatches.push(`${table}: ${field} mismatch`);
      }
    }
    if (JSON.stringify(expected[table].primaryKey) !== JSON.stringify(actual[table].primaryKey)) {
      mismatches.push(`${table}: primary key mismatch`);
    }
  }
  return mismatches;
}

async function integrityChecks(client) {
  const checks = await client.query(`
    select 'duplicate_queue_positions' name, count(*)::int value from (
      select curated_set_id, position from public.curated_set_tracks group by 1, 2 having count(*) > 1
    ) q
    union all
    select 'multiple_active_sets', count(*)::int from (
      select scene_id from public.curated_sets where is_active group by 1 having count(*) > 1
    ) q
    union all
    select 'orphan_playback_sources', count(*)::int from public.playback_sources p
      left join public.tracks t on t.id = p.track_id where t.id is null
    union all
    select 'orphan_ambience_sources', count(*)::int from public.ambience_asset_sources s
      left join public.ambience_assets a on a.id = s.asset_id where a.id is null
    union all
    select 'missing_private_provenance', count(*)::int from public.ambience_asset_sources s
      left join private.ambience_asset_provenance p on p.asset_source_id = s.id where p.asset_source_id is null
    union all
    select 'profiles_without_admin', count(*)::int from public.profiles p
      left join public.app_admins a on a.user_id = p.id where a.user_id is null
    union all
    select 'audits_without_admin', count(*)::int from public.admin_audit_log l
      left join public.app_admins a on a.user_id = l.actor_id where a.user_id is null
    union all
    select 'reservations_without_admin', count(*)::int from public.admin_upload_reservations r
      left join public.app_admins a on a.user_id = r.actor_id where a.user_id is null
  `);
  return checks.rows;
}

async function verifyRuntime(runtimeUrl) {
  const client = new Client(clientConfig(runtimeUrl));
  await client.connect();
  try {
    const identity = await client.query(
      `select current_user as role, count(*)::int as live_scenes from public.scenes where is_live`,
    );
    if (identity.rows[0].role !== "music_app_runtime" || identity.rows[0].live_scenes < 1) {
      throw new Error("Limited runtime read verification failed");
    }
    await client.query("begin");
    const update = await client.query(
      `update public.scenes set foreground_text_color = foreground_text_color
        where id = (select id from public.scenes order by id limit 1)`,
    );
    if (update.rowCount !== 1) throw new Error("Limited runtime transaction verification failed");
    await client.query("rollback");

    let ddlDenied = false;
    await client.query("begin");
    try {
      await client.query("create table public.__runtime_privilege_probe(id integer)");
    } catch {
      ddlDenied = true;
    } finally {
      await client.query("rollback");
    }
    if (!ddlDenied) throw new Error("Limited runtime unexpectedly has schema creation privileges");
    return { liveScenes: identity.rows[0].live_scenes, rollback: true, ddlDenied };
  } finally {
    await client.end();
  }
}

export async function reconcile({ databaseUrl, runtimeUrl, inventoryPath }) {
  const inventory = JSON.parse(await readFile(inventoryPath, "utf8"));
  const client = new Client(clientConfig(databaseUrl));
  await client.connect();
  try {
    const actual = {};
    for (const table of APPROVED_TABLES) actual[table] = await tableMetric(client, table);
    const mismatches = compareMetrics(inventory.tables, actual);
    if (mismatches.length > 0) throw new Error(mismatches.join("; "));
    const integrity = await integrityChecks(client);
    const failedIntegrity = integrity.filter((check) => check.value !== 0);
    if (failedIntegrity.length > 0) {
      throw new Error(failedIntegrity.map((check) => `${check.name}=${check.value}`).join("; "));
    }
    const runtime = await verifyRuntime(runtimeUrl);
    return {
      snapshotTime: inventory.snapshotTime,
      tables: APPROVED_TABLES.length,
      rows: Object.values(actual).reduce((sum, metric) => sum + metric.count, 0),
      integrityChecks: integrity.length,
      runtime,
      missingStorageReferences: inventory.storageReferences.filter((item) => !item.object_exists)
        .length,
    };
  } finally {
    await client.end();
  }
}

async function main() {
  const inventoryPath = process.argv[2];
  if (!inventoryPath)
    throw new Error("Usage: node scripts/shadow-production-reconcile.mjs <source-inventory.json>");
  const result = await reconcile({
    databaseUrl: process.env.DATABASE_URL_UNPOOLED,
    runtimeUrl: process.env.DATABASE_URL,
    inventoryPath,
  });
  console.log(
    `Reconciled snapshot ${result.snapshotTime}; tables=${result.tables}; rows=${result.rows}; ` +
      `integrity=${result.integrityChecks}; missing-storage=${result.missingStorageReferences}; ` +
      `runtime-scenes=${result.runtime.liveScenes}; rollback=${result.runtime.rollback}; ddl-denied=${result.runtime.ddlDenied}`,
  );
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : "Shadow reconciliation failed");
    process.exitCode = 1;
  });
}
