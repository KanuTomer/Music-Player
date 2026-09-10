import { defineConfig } from "drizzle-kit";

const databaseUrl = process.env.DATABASE_URL_UNPOOLED;

if (!databaseUrl) {
  throw new Error("DATABASE_URL_UNPOOLED is required.");
}

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema.ts",
  out: "./drizzle/migrations",
  dbCredentials: {
    url: databaseUrl,
  },
  migrations: {
    schema: "drizzle",
    table: "__drizzle_migrations",
  },
});