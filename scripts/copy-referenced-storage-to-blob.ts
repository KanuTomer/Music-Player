import { createHash } from "node:crypto";
import { put } from "@vercel/blob";
import { Pool } from "pg";

const databaseUrl = process.env["DATABASE_URL_UNPOOLED"] ?? process.env["DATABASE_URL"];
const supabaseUrl = process.env["SUPABASE_URL"]?.replace(/\/$/, "");
const supabaseSecret = process.env["SUPABASE_SECRET_KEY"];
const blobToken = process.env["BLOB_READ_WRITE_TOKEN"];
if (!databaseUrl || !supabaseUrl || !supabaseSecret || !blobToken) {
  throw new Error("Migration environment is incomplete");
}

type ObjectRow = {
  bucket: "scene-media" | "ambience-audio";
  path: string;
  expected_hash: string | null;
};
const pool = new Pool({ connectionString: databaseUrl, max: 1, ssl: { rejectUnauthorized: true } });

async function copyObject(object: ObjectRow): Promise<void> {
  const source = await fetch(
    `${supabaseUrl}/storage/v1/object/authenticated/${object.bucket}/${object.path}`,
    {
      headers: { apikey: supabaseSecret, authorization: `Bearer ${supabaseSecret}` },
    },
  );
  if (!source.ok) throw new Error(`Source object unavailable (${source.status})`);
  const contentType =
    source.headers.get("content-type") ??
    (object.bucket === "scene-media" ? "image/webp" : "audio/mpeg");
  const bytes = Buffer.from(await source.arrayBuffer());
  const sourceHash = createHash("sha256").update(bytes).digest("hex");
  if (object.expected_hash && object.expected_hash.toLowerCase() !== sourceHash)
    throw new Error("Source object hash mismatch");
  const uploaded = await put(`${object.bucket}/${object.path}`, bytes, {
    access: "public",
    token: blobToken,
    contentType,
    addRandomSuffix: false,
    allowOverwrite: true,
    cacheControlMaxAge: 31_536_000,
  });
  const verification = await fetch(uploaded.url, { cache: "no-store" });
  if (!verification.ok) throw new Error(`Blob verification failed (${verification.status})`);
  const copiedBytes = Buffer.from(await verification.arrayBuffer());
  if (
    copiedBytes.length !== bytes.length ||
    createHash("sha256").update(copiedBytes).digest("hex") !== sourceHash
  )
    throw new Error("Blob size or hash mismatch");
  if ((verification.headers.get("content-type") ?? "").split(";")[0] !== contentType.split(";")[0])
    throw new Error("Blob MIME type mismatch");
}

try {
  const result = await pool.query<ObjectRow>(`
    select 'scene-media'::text bucket, background_storage_path path, null::text expected_hash
      from scenes where background_storage_path is not null
    union
    select 'ambience-audio', storage_path, null::text expected_hash
      from ambience_assets
    order by 1,2
  `);
  await Promise.all(result.rows.map(copyObject));
  console.info("Referenced Storage migration verified", { objects: result.rows.length });
} finally {
  await pool.end();
}
