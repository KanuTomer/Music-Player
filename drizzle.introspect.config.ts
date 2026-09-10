import { defineConfig } from "drizzle-kit";

const databaseUrl = process.env.DATABASE_URL_UNPOOLED;

if (!databaseUrl) {
  throw new Error(
    "DATABASE_URL_UNPOOLED is required. Run Drizzle with .env.development.local.",
  );
}

export default defineConfig({
  dialect: "postgresql",
  dbCredentials: {
    url: databaseUrl,
  },
  out: "./drizzle/introspection",
  schemaFilter: ["public"],
  tablesFilter: [
    "sponsors",
    "scenes",
    "tracks",
    "oneliners",
    "ambience_assets",
    "ambience_asset_sources",
    "sound_stems",
    "ambience_profiles",
    "curated_sets",
    "curated_set_tracks",
    "playback_sources",
  ],
  introspect: {
    casing: "camel",
  },
});