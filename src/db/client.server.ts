import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

const configuredConnectionString = process.env["DATABASE_URL"];

if (!configuredConnectionString) {
  throw new Error("DATABASE_URL is required for the server-side Neon connection.");
}

let databaseUrl: URL;

try {
  databaseUrl = new URL(configuredConnectionString);
} catch {
  throw new Error("DATABASE_URL is not a valid PostgreSQL connection URL.");
}

if (!databaseUrl.hostname.includes("-pooler")) {
  throw new Error(
    "DATABASE_URL must use Neon's pooled hostname containing '-pooler'. Use DATABASE_URL_UNPOOLED only for migrations.",
  );
}

const sslMode = databaseUrl.searchParams.get("sslmode");
if (sslMode === "prefer" || sslMode === "require" || sslMode === "verify-ca") {
  databaseUrl.searchParams.set("sslmode", "verify-full");
}
const connectionString = databaseUrl.toString();

type NeonGlobal = typeof globalThis & {
  __musicAppNeonPool?: Pool;
};

const neonGlobal = globalThis as NeonGlobal;

export const neonPool =
  neonGlobal.__musicAppNeonPool ??
  new Pool({
    connectionString,
    max: 5,
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 10_000,
    application_name: "sainik-dhaba-render",
  });

if (process.env["NODE_ENV"] !== "production") {
  neonGlobal.__musicAppNeonPool = neonPool;
}

export const db = drizzle(neonPool, {
  schema,
});
