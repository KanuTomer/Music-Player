import { attachDatabasePool } from "@vercel/functions";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

const connectionString = process.env["DATABASE_URL"];

if (!connectionString) {
  throw new Error("DATABASE_URL is required for the server-side Neon connection.");
}

let databaseUrl: URL;

try {
  databaseUrl = new URL(connectionString);
} catch {
  throw new Error("DATABASE_URL is not a valid PostgreSQL connection URL.");
}

if (!databaseUrl.hostname.includes("-pooler")) {
  throw new Error(
    "DATABASE_URL must use Neon's pooled hostname containing '-pooler'. Use DATABASE_URL_UNPOOLED only for migrations.",
  );
}

type NeonGlobal = typeof globalThis & {
  __musicAppNeonPool?: Pool;
  __musicAppNeonPoolAttached?: boolean;
};

const neonGlobal = globalThis as NeonGlobal;

export const neonPool =
  neonGlobal.__musicAppNeonPool ??
  new Pool({
    connectionString,
    max: 5,
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 10_000,
    application_name: "sainik-dhaba-vercel",
  });

if (process.env["NODE_ENV"] !== "production") {
  neonGlobal.__musicAppNeonPool = neonPool;
}

if (!neonGlobal.__musicAppNeonPoolAttached) {
  attachDatabasePool(neonPool);
  neonGlobal.__musicAppNeonPoolAttached = true;
}

export const db = drizzle(neonPool, {
  schema,
});
