import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

const [, , assetArgument, slugArgument] = process.argv;
if (!assetArgument) {
  throw new Error(
    "Usage: bun scripts/upload-ambience-visuals.mjs <prepared-asset-dir> [scene-slug]",
  );
}
const assetDir = resolve(assetArgument);
const url = process.env.SUPABASE_URL;
const secret = process.env.SUPABASE_SECRET_KEY;
if (!url || !secret) throw new Error("SUPABASE_URL and SUPABASE_SECRET_KEY are required");
const client = createClient(url, secret, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const manifest = JSON.parse(await readFile(join(assetDir, "ambience-visual-assets.json"), "utf8"));

const selectedAssets = slugArgument
  ? manifest.assets.filter((asset) => asset.slug === slugArgument)
  : manifest.assets;
if (!selectedAssets.length) throw new Error(`No prepared asset found for ${slugArgument}`);

for (const asset of selectedAssets) {
  const data = await readFile(join(assetDir, asset.storagePath));
  const hash = createHash("sha256").update(data).digest("hex").toUpperCase();
  if (data.length !== asset.bytes || hash !== asset.sha256) {
    throw new Error(`Prepared asset mismatch: ${asset.storagePath}`);
  }
  const { error } = await client.storage.from("scene-media").upload(asset.storagePath, data, {
    contentType: "video/mp4",
    cacheControl: "31536000",
    upsert: true,
  });
  if (error) throw new Error(`${asset.storagePath}: ${error.message}`);
  const publicUrl = client.storage.from("scene-media").getPublicUrl(asset.storagePath)
    .data.publicUrl;
  const response = await fetch(publicUrl, { cache: "no-store" });
  const contentType = response.headers.get("content-type")?.split(";", 1)[0];
  if (
    !response.ok ||
    Number(response.headers.get("content-length")) !== asset.bytes ||
    contentType !== "video/mp4"
  ) {
    throw new Error(
      `Public verification failed: ${asset.storagePath} (status=${response.status}, bytes=${response.headers.get("content-length")}, type=${contentType})`,
    );
  }
  console.log(`verified ${asset.storagePath} ${asset.bytes} bytes`);
}
