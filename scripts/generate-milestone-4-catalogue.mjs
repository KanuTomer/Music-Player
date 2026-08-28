import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

const inventoryDir = resolve(process.argv[2] ?? "../milestone-plans/milestone-4-catalogue");
const migrationPath = resolve(
  process.argv[3] ?? "supabase/migrations/20260828114658_authoritative_music_queue.sql",
);

const playlists = [
  ["sainik-dhaba", "Sainik Dhaba Radio", "PLO1WqL1Pm6ic"],
  ["nai-ki-dukaan", "Deluxe Salon Radio", "PLRrYJLVviXe3yGN2NIrw0Qj_jEmjQpOKi"],
  ["chai-ki-tapri", "Chai ki Tapri Radio", "PLUByR8i-v0KY"],
  ["raj-mistri", "Raj Mistri Radio", "PLd--yIT4E7VcYzwx3iawJLQFdAk9HyAZa"],
  ["rail-yatra", "Rail Yatra Radio", "PLQdfb6nEJz_X-0Tkwec2N2Sj83d_DM36d"],
  ["raat-ki-bus", "Raat ki Bus Radio", "PL8xy2vgHsFJjhGJJnwp8mspv27hN4K_Bg"],
  ["sarkari-daftar", "Sarkari Daftar Radio", "PLJABXrnHALkJHG7vK7QMhJ6_Wxl6OPriF"],
  ["doordarshan-shaam", "Doordarshan Shaam Radio", "PLiIasA9CetIoIgLf6e_EXMVbAPr-04g6z"],
  ["bhojpuriya-devara", "Bhojpuriya Devara Radio", "PLJ3M6AoVR-gZtOkB4v-_XgzYQz_6UQssJ"],
  ["corporate-majdoor", "Corporate Majdoor Radio", "PLLounUW9rgqHr6YYR7r4oQOIeqdCZ7gO8"],
];

const quote = (value) => (value == null ? "NULL" : `'${String(value).replaceAll("'", "''")}'`);
const chunks = (items, size = 250) => {
  const result = [];
  for (let index = 0; index < items.length; index += size)
    result.push(items.slice(index, index + size));
  return result;
};

const importedByVideo = new Map();
const memberships = [];
const counts = {};
for (const [slug, setTitle, playlistId] of playlists) {
  const raw = JSON.parse(readFileSync(join(inventoryDir, `${slug}.raw.json`), "utf8"));
  if (raw.id !== playlistId) throw new Error(`${slug}: expected ${playlistId}, received ${raw.id}`);
  counts[slug] = { playlist: raw.entries.length, legacy: 0 };
  raw.entries.forEach((entry, index) => {
    if (!entry?.id) throw new Error(`${slug}: missing video at position ${index + 1}`);
    const key = `youtube:${entry.id}`;
    if (!importedByVideo.has(entry.id)) {
      importedByVideo.set(entry.id, {
        key,
        id: entry.id,
        title: entry.title || `YouTube video ${entry.id}`,
        channel: entry.channel || entry.uploader || null,
      });
    }
    memberships.push({ slug, key, position: index + 1, daypart: "all" });
  });
}

const legacy = JSON.parse(readFileSync(join(inventoryDir, "legacy-live-tracks.raw.json"), "utf8"));
const legacySourceByVideo = new Map();
const excluded = [];
const rejectedLegacyIds = new Set(["9538abc8-aa8b-4646-94bb-91c3f3a0f213"]);
for (const item of legacy.sort(
  (a, b) => a.scene_slug.localeCompare(b.scene_slug) || a.sort_order - b.sort_order,
)) {
  if (rejectedLegacyIds.has(item.id)) {
    excluded.push({
      id: item.id,
      title: item.title,
      reason: "audit rejected unrelated search result",
    });
    continue;
  }
  const matchPath = join(inventoryDir, "legacy-matches", `${item.id}.raw.json`);
  let match;
  try {
    match = JSON.parse(readFileSync(matchPath, "utf8")).entries?.[0];
  } catch {
    excluded.push({ id: item.id, title: item.title, reason: "unverified source" });
    continue;
  }
  if (!match?.id) {
    excluded.push({ id: item.id, title: item.title, reason: "unverified source" });
    continue;
  }
  const importedMatch = importedByVideo.get(match.id);
  const canonical = importedMatch ? null : (legacySourceByVideo.get(match.id) ?? item);
  if (canonical) legacySourceByVideo.set(match.id, canonical);
  const key = importedMatch ? importedMatch.key : `legacy:${canonical.id}`;
  const base = counts[item.scene_slug]?.playlist;
  if (base == null) throw new Error(`Legacy track references non-live scene ${item.scene_slug}`);
  counts[item.scene_slug].legacy += 1;
  memberships.push({
    slug: item.scene_slug,
    key,
    position: base + counts[item.scene_slug].legacy,
    daypart: item.daypart_tag,
  });
  if (canonical) canonical.match ??= match;
}

const lines = [];
lines.push(
  "INSERT INTO public.curated_sets(scene_id, title, sort_order, is_active, shuffle_start, origin_provider, origin_external_id)",
);
lines.push("SELECT s.id, v.title, s.sort_order, true, true, 'youtube', v.playlist_id");
lines.push("FROM (VALUES");
lines.push(
  playlists
    .map(([slug, title, id]) => `  (${quote(slug)}, ${quote(title)}, ${quote(id)})`)
    .join(",\n"),
);
lines.push(") AS v(slug, title, playlist_id) JOIN public.scenes s ON s.slug = v.slug;");

const imported = [...importedByVideo.values()];
for (const part of chunks(imported)) {
  lines.push(
    "INSERT INTO public.tracks(catalogue_key, scene_id, title, artist, daypart_tag, sort_order)",
  );
  lines.push("VALUES");
  lines.push(
    part
      .map((v) => `  (${quote(v.key)}, NULL, ${quote(v.title)}, ${quote(v.channel)}, 'all', 0)`)
      .join(",\n"),
  );
  lines.push("ON CONFLICT (catalogue_key) DO NOTHING;");
}

const sources = [
  ...imported.map((v) => ({ key: v.key, ...v })),
  ...[...legacySourceByVideo.entries()].map(([id, item]) => ({
    key: `legacy:${item.id}`,
    id,
    title: item.match.title,
    channel: item.match.channel || item.match.uploader || null,
  })),
];
for (const part of chunks(sources)) {
  lines.push(
    "INSERT INTO public.playback_sources(track_id, provider, provider_item_id, source_url, provider_title, provider_channel, priority, validated_at, is_active)",
  );
  lines.push(
    "SELECT t.id, 'youtube', v.video_id, 'https://www.youtube.com/watch?v=' || v.video_id, v.provider_title, v.provider_channel, 0, '2026-08-28T00:00:00Z'::timestamptz, true",
  );
  lines.push("FROM (VALUES");
  lines.push(
    part
      .map((v) => `  (${quote(v.key)}, ${quote(v.id)}, ${quote(v.title)}, ${quote(v.channel)})`)
      .join(",\n"),
  );
  lines.push(
    ") AS v(catalogue_key, video_id, provider_title, provider_channel) JOIN public.tracks t USING (catalogue_key)",
  );
  lines.push("ON CONFLICT (provider, provider_item_id) DO NOTHING;");
}

for (const part of chunks(memberships)) {
  lines.push(
    "INSERT INTO public.curated_set_tracks(curated_set_id, track_id, position, daypart_tag)",
  );
  lines.push("SELECT cs.id, t.id, v.position, v.daypart_tag FROM (VALUES");
  lines.push(
    part
      .map((v) => `  (${quote(v.slug)}, ${quote(v.key)}, ${v.position}, ${quote(v.daypart)})`)
      .join(",\n"),
  );
  lines.push(") AS v(slug, catalogue_key, position, daypart_tag)");
  lines.push(
    "JOIN public.scenes s ON s.slug = v.slug JOIN public.curated_sets cs ON cs.scene_id = s.id AND cs.is_active JOIN public.tracks t USING (catalogue_key);",
  );
}

lines.push("DO $$ BEGIN");
lines.push(
  "  IF (SELECT count(*) FROM public.curated_sets WHERE is_active) <> 10 THEN RAISE EXCEPTION 'expected ten active curated sets'; END IF;",
);
lines.push(
  "  IF EXISTS (SELECT 1 FROM public.curated_set_tracks cst LEFT JOIN public.playback_sources ps ON ps.track_id = cst.track_id AND ps.is_active WHERE ps.id IS NULL) THEN RAISE EXCEPTION 'active membership without source'; END IF;",
);
lines.push("END $$;");

const original = readFileSync(migrationPath, "utf8");
const start = "-- BEGIN GENERATED CATALOGUE (see scripts/generate-milestone-4-catalogue.mjs)";
const end = "-- END GENERATED CATALOGUE";
const generated = `${start}\n${lines.join("\n")}\n${end}`;
const startIndex = original.indexOf(start);
const endIndex = original.indexOf(end, startIndex);
if (startIndex < 0 || endIndex < 0) throw new Error("Generated catalogue markers are missing");
writeFileSync(
  migrationPath,
  original.slice(0, startIndex) + generated + original.slice(endIndex + end.length),
);

const manifest = {
  generatedAt: new Date().toISOString(),
  playlistEntries: memberships.length - (legacy.length - excluded.length),
  membershipCount: memberships.length,
  uniqueImportedVideos: imported.length,
  verifiedLegacyMemberships: legacy.length - excluded.length,
  excluded,
  counts,
  migrationSha256: createHash("sha256").update(lines.join("\n")).digest("hex"),
};
writeFileSync(join(inventoryDir, "catalogue-manifest.json"), JSON.stringify(manifest, null, 2));
console.log(JSON.stringify(manifest, null, 2));
