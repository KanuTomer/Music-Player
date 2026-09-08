import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const repository = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const environment = Object.fromEntries(
  (await readFile(resolve(repository, ".env.local"), "utf8"))
    .split(/\r?\n/)
    .filter((line) => line && !line.trimStart().startsWith("#") && line.includes("="))
    .map((line) => {
      const separator = line.indexOf("=");
      return [line.slice(0, separator).trim(), line.slice(separator + 1).trim().replace(/^['"]|['"]$/g, "")];
    }),
);
const url = environment.SUPABASE_URL;
const secret = environment.SUPABASE_SECRET_KEY;
if (!url || !secret) throw new Error("SUPABASE_URL and SUPABASE_SECRET_KEY are required in .env.local.");

const client = createClient(url, secret, { auth: { persistSession: false, autoRefreshToken: false } });
const manifest = JSON.parse(await readFile(resolve(repository, "scripts/generated/ambience-mp3-manifest.json"), "utf8"));

async function sha256(bytes) {
  const hash = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(hash)].map((value) => value.toString(16).padStart(2, "0")).join("").toUpperCase();
}

for (const asset of manifest.assets) {
  const bytes = await readFile(resolve(repository, asset.outputFile));
  if (bytes.byteLength !== asset.bytes || (await sha256(bytes)) !== asset.sha256)
    throw new Error(`Local MP3 validation failed for ${asset.newStoragePath}.`);
  const { error } = await client.storage.from("ambience-audio").upload(asset.newStoragePath, bytes, {
    cacheControl: "31536000",
    contentType: "audio/mpeg",
    upsert: false,
  });
  if (error && !/already exists|duplicate/i.test(error.message)) throw new Error(`${asset.newStoragePath}: ${error.message}`);
  if (error) {
    const { data, error: downloadError } = await client.storage.from("ambience-audio").download(asset.newStoragePath);
    if (downloadError || !data || (await sha256(new Uint8Array(await data.arrayBuffer()))) !== asset.sha256)
      throw new Error(`Existing object does not match ${asset.newStoragePath}.`);
  }
  console.log(`${error ? "verified" : "uploaded"} ${asset.newStoragePath}`);
}
