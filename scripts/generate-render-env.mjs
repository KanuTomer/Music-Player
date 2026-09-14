import { readFile, writeFile } from "node:fs/promises";

async function readEnvironment(source) {
  const values = new Map();
  const text = await readFile(source, "utf8").catch(() => "");
  for (const line of text.split(/\r?\n/)) {
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (match) values.set(match[1], match[2]);
  }
  return values;
}

// Keep the two credential domains explicit. The Render API uses the imported
// shadow-production Neon database and production Supabase Auth/Storage; taking
// the first value found across local files can silently mix rehearsal projects.
const neonValues = await readEnvironment(".env.production-migration.local");
const supabaseValues = await readEnvironment(".env.local");
const localSecretValues = await readEnvironment(".env.development.local");
const values = new Map([
  ["DATABASE_URL", neonValues.get("DATABASE_URL")],
  ["SUPABASE_URL", supabaseValues.get("SUPABASE_URL")],
  ["SUPABASE_PUBLISHABLE_KEY", supabaseValues.get("SUPABASE_PUBLISHABLE_KEY")],
  ["SUPABASE_PROJECT_ID", supabaseValues.get("SUPABASE_PROJECT_ID")],
  ["SUPABASE_SECRET_KEY", supabaseValues.get("SUPABASE_SECRET_KEY")],
  ["CRON_SECRET", localSecretValues.get("CRON_SECRET")],
]);

const required = [
  "DATABASE_URL",
  "SUPABASE_URL",
  "SUPABASE_PUBLISHABLE_KEY",
  "SUPABASE_PROJECT_ID",
  "SUPABASE_SECRET_KEY",
  "CRON_SECRET",
];
for (const key of required) {
  if (!values.get(key)?.trim()) throw new Error(`Missing required local variable: ${key}`);
}

const databaseUrl = new URL(values.get("DATABASE_URL"));
if (!databaseUrl.hostname.includes("-pooler")) {
  throw new Error("DATABASE_URL must use the pooled Neon hostname");
}

const output = [
  `DATABASE_URL=${values.get("DATABASE_URL")}`,
  "DATA_BACKEND=neon",
  "OPERATIONAL_WRITE_BACKEND=neon",
  "ADMIN_AUTHORIZATION_BACKEND=neon",
  "ADMIN_DATA_BACKEND=neon",
  "CLEANUP_BACKEND=neon",
  `SUPABASE_URL=${values.get("SUPABASE_URL")}`,
  `SUPABASE_PUBLISHABLE_KEY=${values.get("SUPABASE_PUBLISHABLE_KEY")}`,
  `SUPABASE_PROJECT_ID=${values.get("SUPABASE_PROJECT_ID")}`,
  `SUPABASE_SECRET_KEY=${values.get("SUPABASE_SECRET_KEY")}`,
  `CRON_SECRET=${values.get("CRON_SECRET")}`,
  "ALLOWED_ORIGINS=https://music-player-theta-nine-56.vercel.app,https://music-player-git-feat-neon-d-1f4d83-kanutomer123-6953s-projects.vercel.app",
  "NODE_ENV=production",
  "",
].join("\n");

await writeFile("render-backend.env.local", output, { encoding: "utf8", mode: 0o600 });
console.log("Generated render-backend.env.local with 13 variables; values were not printed.");
