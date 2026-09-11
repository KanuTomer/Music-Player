import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import { pathToFileURL } from "node:url";
import pg from "pg";

const execFileAsync = promisify(execFile);
const { Client } = pg;

export const APPROVED_TABLES = [
  "public.sponsors",
  "public.scenes",
  "public.tracks",
  "public.playback_sources",
  "public.curated_sets",
  "public.curated_set_tracks",
  "public.oneliners",
  "public.ambience_profiles",
  "public.ambience_assets",
  "public.ambience_asset_sources",
  "public.sound_stems",
  "private.ambience_asset_provenance",
  "public.room_visits",
  "public.playback_source_failures",
  "public.app_admins",
  "public.profiles",
  "public.admin_audit_log",
  "public.admin_rate_limits",
  "public.admin_upload_reservations",
  "public.admin_storage_cleanup_queue",
];

export const EXCLUDED_TABLES = [
  "public.chat_messages",
  "public.reactions",
  "public.generated_rooms",
  "public.saved_rooms",
];

export const RESTORE_ORDER = [
  "public.sponsors",
  "public.app_admins",
  "public.scenes",
  "public.tracks",
  "public.playback_sources",
  "public.curated_sets",
  "public.curated_set_tracks",
  "public.oneliners",
  "public.ambience_profiles",
  "public.ambience_assets",
  "public.ambience_asset_sources",
  "private.ambience_asset_provenance",
  "public.sound_stems",
  "public.room_visits",
  "public.playback_source_failures",
  "public.profiles",
  "public.admin_audit_log",
  "public.admin_rate_limits",
  "public.admin_upload_reservations",
  "public.admin_storage_cleanup_queue",
];

const quoteIdentifier = (value) => `"${value.replaceAll('"', '""')}"`;

export function parseApprovedToc(toc) {
  const tableData = [];
  const sequenceSets = [];
  for (const line of toc.split(/\r?\n/)) {
    const tableMatch = line.match(/ TABLE DATA ([^ ]+) ([^ ]+) /);
    if (tableMatch) tableData.push(`${tableMatch[1]}.${tableMatch[2]}`);
    const sequenceMatch = line.match(/ SEQUENCE SET ([^ ]+) ([^ ]+) /);
    if (sequenceMatch) sequenceSets.push(`${sequenceMatch[1]}.${sequenceMatch[2]}`);
  }
  return {
    tableData: [...new Set(tableData)].sort(),
    sequenceSets: [...new Set(sequenceSets)].sort(),
  };
}

export function orderApprovedToc(toc) {
  const lines = toc.split(/\r?\n/);
  const comments = lines.filter((line) => line.startsWith(";") || line.length === 0);
  const tableLines = new Map();
  const sequenceLines = [];
  for (const line of lines) {
    const tableMatch = line.match(/ TABLE DATA ([^ ]+) ([^ ]+) /);
    if (tableMatch) tableLines.set(`${tableMatch[1]}.${tableMatch[2]}`, line);
    if (line.match(/ SEQUENCE SET ([^ ]+) ([^ ]+) /)) sequenceLines.push(line);
  }
  if (
    tableLines.size !== RESTORE_ORDER.length ||
    RESTORE_ORDER.some((table) => !tableLines.has(table))
  ) {
    throw new Error("Cannot order an incomplete or unexpected approved-data TOC");
  }
  return [
    ...comments,
    ...RESTORE_ORDER.map((table) => tableLines.get(table)),
    ...sequenceLines,
    "",
  ].join("\n");
}

function databaseArgs(databaseUrl) {
  const url = new URL(databaseUrl);
  return {
    args: [
      "--host",
      url.hostname,
      "--port",
      url.port || "5432",
      "--username",
      decodeURIComponent(url.username),
      "--dbname",
      decodeURIComponent(url.pathname.slice(1)),
    ],
    env: {
      ...process.env,
      PGPASSWORD: decodeURIComponent(url.password),
      PGSSLMODE: "require",
      PGCONNECT_TIMEOUT: "15",
    },
  };
}

export function clientConfig(databaseUrl) {
  const url = new URL(databaseUrl);
  return {
    host: url.hostname,
    port: Number(url.port || 5432),
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database: decodeURIComponent(url.pathname.slice(1)),
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 15_000,
  };
}

async function runPgDump(pgDump, databaseUrl, snapshot, output, extraArgs) {
  const connection = databaseArgs(databaseUrl);
  await execFileAsync(
    pgDump,
    [...connection.args, "--snapshot", snapshot, "--file", output, ...extraArgs],
    { env: connection.env, windowsHide: true, maxBuffer: 1024 * 1024 },
  );
}

async function primaryKeyColumns(client, schema, table) {
  const result = await client.query(
    `select a.attname
       from pg_index i
       join pg_class c on c.oid = i.indrelid
       join pg_namespace n on n.oid = c.relnamespace
       join lateral unnest(i.indkey) with ordinality k(attnum, ord) on true
       join pg_attribute a on a.attrelid = c.oid and a.attnum = k.attnum
      where i.indisprimary and n.nspname = $1 and c.relname = $2
      order by k.ord`,
    [schema, table],
  );
  return result.rows.map((row) => row.attname);
}

export async function tableMetric(client, qualifiedTable) {
  const [schema, table] = qualifiedTable.split(".");
  const primaryKey = await primaryKeyColumns(client, schema, table);
  if (primaryKey.length === 0) throw new Error(`${qualifiedTable} has no primary key`);
  const order = primaryKey.map((column) => `t.${quoteIdentifier(column)}`).join(", ");
  const rows = await client.query(
    `select to_jsonb(t)::text as row_json from ${quoteIdentifier(schema)}.${quoteIdentifier(table)} t order by ${order}`,
  );
  const hash = createHash("sha256");
  for (const row of rows.rows) hash.update(row.row_json).update("\n");
  return { count: rows.rowCount, primaryKey, sha256: hash.digest("hex") };
}

async function buildInventory(client, snapshotTime) {
  const tables = {};
  for (const table of APPROVED_TABLES) tables[table] = await tableMetric(client, table);

  const allCounts = await client.query(
    `select schemaname || '.' || relname as table_name, n_live_tup::bigint::text as estimated_rows
       from pg_stat_user_tables
      where schemaname in ('public', 'private')
      order by 1`,
  );
  const migrations = await client.query(
    `select version, name, statements from supabase_migrations.schema_migrations order by version`,
  );
  const constraints = await client.query(
    `select n.nspname as schema_name, c.relname as table_name, con.conname,
            pg_get_constraintdef(con.oid, true) as definition
       from pg_constraint con
       join pg_class c on c.oid = con.conrelid
       join pg_namespace n on n.oid = c.relnamespace
      where n.nspname in ('public', 'private')
      order by 1, 2, 3`,
  );
  const functions = await client.query(
    `select n.nspname as schema_name, p.proname, pg_get_function_identity_arguments(p.oid) as arguments,
            pg_get_functiondef(p.oid) as definition
       from pg_proc p join pg_namespace n on n.oid = p.pronamespace
      where n.nspname in ('public', 'private') order by 1, 2, 3`,
  );
  const grants = await client.query(
    `select table_schema, table_name, grantee, privilege_type
       from information_schema.role_table_grants
      where table_schema in ('public', 'private') order by 1, 2, 3, 4`,
  );
  const storageObjects = await client.query(
    `select bucket_id, name, created_at, updated_at, metadata
       from storage.objects
      where bucket_id in ('scene-media', 'ambience-audio') order by bucket_id, name`,
  );
  const storageReferences = await client.query(
    `with refs as (
       select 'scene-media'::text bucket_id, background_storage_path as name, 'scene_background'::text kind
         from public.scenes where background_storage_path is not null
       union all
       select 'ambience-audio'::text, storage_path, 'ambience_asset' from public.ambience_assets
     )
     select r.bucket_id, r.name, r.kind, (o.id is not null) as object_exists
       from refs r left join storage.objects o on o.bucket_id = r.bucket_id and o.name = r.name
      order by r.bucket_id, r.name, r.kind`,
  );
  return {
    snapshotTime,
    source: { database: "company-supabase-production", postgresMajor: 17 },
    approvedTables: APPROVED_TABLES,
    excludedTables: EXCLUDED_TABLES,
    tables,
    allCounts: allCounts.rows,
    migrations: migrations.rows,
    constraints: constraints.rows,
    functions: functions.rows,
    grants: grants.rows,
    storageObjects: storageObjects.rows,
    storageReferences: storageReferences.rows,
  };
}

export async function exportShadowProduction({ databaseUrl, outputDirectory, pgDump, pgRestore }) {
  if (!databaseUrl) throw new Error("SUPABASE_PRODUCTION_DATABASE_URL is required");
  await mkdir(outputDirectory, { recursive: true });
  const client = new Client(clientConfig(databaseUrl));
  await client.connect();
  try {
    await client.query("begin isolation level repeatable read read only");
    const snapshotResult = await client.query(
      `select pg_export_snapshot() as snapshot,
              to_char(statement_timestamp() at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') as captured_at`,
    );
    const snapshot = snapshotResult.rows[0].snapshot;
    const snapshotTime = snapshotResult.rows[0].captured_at;

    await runPgDump(pgDump, databaseUrl, snapshot, path.join(outputDirectory, "schema.dump"), [
      "--format=custom",
      "--schema-only",
      "--schema=public",
      "--schema=private",
    ]);
    await runPgDump(pgDump, databaseUrl, snapshot, path.join(outputDirectory, "recovery.dump"), [
      "--format=custom",
      "--schema=public",
      "--schema=private",
    ]);
    await runPgDump(
      pgDump,
      databaseUrl,
      snapshot,
      path.join(outputDirectory, "approved-data.dump"),
      [
        "--format=custom",
        "--data-only",
        "--no-owner",
        "--no-privileges",
        ...APPROVED_TABLES.flatMap((table) => ["--table", table]),
      ],
    );

    const inventory = await buildInventory(client, snapshotTime);
    await writeFile(
      path.join(outputDirectory, "source-inventory.json"),
      JSON.stringify(inventory, null, 2),
    );
    await writeFile(path.join(outputDirectory, "snapshot-time.txt"), `${snapshotTime}\n`);
    await writeFile(
      path.join(outputDirectory, "approved-tables.txt"),
      `${APPROVED_TABLES.join("\n")}\n`,
    );

    const tocResult = await execFileAsync(
      pgRestore,
      ["--list", path.join(outputDirectory, "approved-data.dump")],
      {
        windowsHide: true,
        maxBuffer: 4 * 1024 * 1024,
      },
    );
    await writeFile(path.join(outputDirectory, "approved-data.toc"), tocResult.stdout);
    const parsed = parseApprovedToc(tocResult.stdout);
    const expected = [...APPROVED_TABLES].sort();
    if (JSON.stringify(parsed.tableData) !== JSON.stringify(expected)) {
      throw new Error(
        `Approved dump TOC mismatch: expected ${expected.length} table-data entries, found ${parsed.tableData.length}`,
      );
    }
    await writeFile(
      path.join(outputDirectory, "approved-data-ordered.toc"),
      orderApprovedToc(tocResult.stdout),
    );
    await client.query("commit");
    return {
      snapshotTime,
      tableCount: parsed.tableData.length,
      sequenceCount: parsed.sequenceSets.length,
    };
  } catch (error) {
    await client.query("rollback").catch(() => {});
    throw error;
  } finally {
    await client.end();
  }
}

async function main() {
  const outputDirectory = process.argv[2];
  if (!outputDirectory)
    throw new Error("Usage: node scripts/shadow-production-export.mjs <output-directory>");
  const pgBin = process.env.PG_BIN || "C:\\Program Files\\PostgreSQL\\17\\bin";
  const result = await exportShadowProduction({
    databaseUrl: process.env.SUPABASE_PRODUCTION_DATABASE_URL,
    outputDirectory: path.resolve(outputDirectory),
    pgDump: path.join(pgBin, "pg_dump.exe"),
    pgRestore: path.join(pgBin, "pg_restore.exe"),
  });
  console.log(
    `Captured ${result.snapshotTime}; approved tables=${result.tableCount}; sequences=${result.sequenceCount}`,
  );
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : "Shadow export failed");
    process.exitCode = 1;
  });
}
