import { randomBytes } from "node:crypto";
import { existsSync } from "node:fs";
import { list } from "@vercel/blob";

async function loadEnv(path: string): Promise<Record<string, string>> {
  if (!existsSync(path)) return {};
  const text = await Bun.file(path).text();
  return Object.fromEntries(
    text
      .split(/\r?\n/)
      .map((line) => line.match(/^([A-Z0-9_]+)=(.*)$/))
      .filter((match): match is RegExpMatchArray => Boolean(match))
      .map((match) => [match[1]!, match[2]!.trim().replace(/^"|"$/g, "")]),
  );
}

function required(values: Record<string, string>, key: string): string {
  const value = values[key];
  if (!value) throw new Error(`Missing ${key} in ignored local configuration.`);
  return value;
}

const migration = await loadEnv(".env.supabase-exit-migration.local");
const deployment = await loadEnv("render-main.env.local");
const vercel = await loadEnv("vercel-main-production.env.local");
const database = await loadEnv(".env.production-migration.local");

const blobToken = required(migration, "BLOB_READ_WRITE_TOKEN");
const blob = await list({ token: blobToken, limit: 1 });
const blobUrl = blob.blobs[0]?.url;
if (!blobUrl) throw new Error("No verified Blob object is available.");
const blobOrigin = new URL(blobUrl).origin;
const databaseUrl = required(database, "DATABASE_URL");
if (!databaseUrl.includes("neon.tech"))
  throw new Error("DATABASE_URL must be the pooled Neon URL.");

const cronSecret = required(deployment, "CRON_SECRET");
const allowedOrigins = required(deployment, "ALLOWED_ORIGINS");
const siteUrl = required(vercel, "VITE_SITE_URL");
const apiBase = "https://music-player-api-test.onrender.com";

await Bun.write(
  "render-supabase-exit.env.local",
  [
    `DATABASE_URL=${databaseUrl}`,
    `BETTER_AUTH_SECRET=${randomBytes(32).toString("base64url")}`,
    `BETTER_AUTH_URL=${siteUrl}`,
    `BLOB_READ_WRITE_TOKEN=${blobToken}`,
    `BLOB_PUBLIC_BASE_URL=${blobOrigin}`,
    `CRON_SECRET=${cronSecret}`,
    `ALLOWED_ORIGINS=${allowedOrigins}`,
    "NODE_ENV=production",
    "",
  ].join("\n"),
);

await Bun.write(
  "vercel-supabase-exit.env.local",
  [
    "VITE_API_BASE_URL=/api/v1",
    `VITE_WS_BASE_URL=${apiBase.replace(/^https:/, "wss:")}/api/v1/realtime`,
    `RENDER_API_BASE_URL=${apiBase}`,
    `VITE_SITE_URL=${siteUrl}`,
    `CRON_SECRET=${cronSecret}`,
    "",
  ].join("\n"),
);

console.info("Generated ignored Render and Vercel Supabase-exit environment files.");
