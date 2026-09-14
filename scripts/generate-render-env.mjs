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
if (databaseUrl.username !== "music_app_runtime") {
  throw new Error("DATABASE_URL must use the least-privilege Neon runtime role");
}

const productionProjectId = "oeliynmdbnbrvnkwgpdm";
const supabaseProjectId = new URL(values.get("SUPABASE_URL")).hostname.split(".")[0];
if (
  values.get("SUPABASE_PROJECT_ID") !== productionProjectId ||
  supabaseProjectId !== productionProjectId ||
  supabaseValues.get("VITE_SUPABASE_PROJECT_ID") !== productionProjectId
) {
  throw new Error("Supabase server and browser variables must target production");
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
  "ALLOWED_ORIGINS=https://music-player-theta-nine-56.vercel.app,https://music-player-git-main-kanutomer123-6953s-projects.vercel.app",
  "NODE_ENV=production",
  "",
].join("\n");

await writeFile("render-main.env.local", output, { encoding: "utf8", mode: 0o600 });

const renderApiUrl = "https://music-player-api-test.onrender.com";
const frontendOutput = [
  `VITE_API_BASE_URL=${renderApiUrl}`,
  `RENDER_API_BASE_URL=${renderApiUrl}`,
  `VITE_SUPABASE_URL=${supabaseValues.get("VITE_SUPABASE_URL")}`,
  `VITE_SUPABASE_PUBLISHABLE_KEY=${supabaseValues.get("VITE_SUPABASE_PUBLISHABLE_KEY")}`,
  `VITE_SUPABASE_PROJECT_ID=${supabaseValues.get("VITE_SUPABASE_PROJECT_ID")}`,
  "VITE_SITE_URL=https://music-player-theta-nine-56.vercel.app",
  `CRON_SECRET=${values.get("CRON_SECRET")}`,
  "",
].join("\n");

for (const key of [
  "VITE_SUPABASE_URL",
  "VITE_SUPABASE_PUBLISHABLE_KEY",
  "VITE_SUPABASE_PROJECT_ID",
]) {
  if (!supabaseValues.get(key)?.trim()) throw new Error(`Missing required local variable: ${key}`);
}

await writeFile("vercel-main-production.env.local", frontendOutput, {
  encoding: "utf8",
  mode: 0o600,
});
console.log("Generated personal-main Render and Vercel import files; values were not printed.");
