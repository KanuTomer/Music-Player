import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const [, , manifestArgument, migrationArgument] = process.argv;
if (!manifestArgument || !migrationArgument) {
  throw new Error(
    "Usage: node scripts/generate-seven-jagah-staged-catalogue.mjs <approved-manifest.json> <migration.sql>",
  );
}
const manifestPath = resolve(manifestArgument);
const migrationPath = resolve(migrationArgument);

const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
const checksum = createHash("sha256").update(JSON.stringify(manifest.selections)).digest("hex");
if (manifest.status !== "approved" || checksum !== manifest.sha256) {
  throw new Error("The catalogue manifest is not approved or its checksum is invalid");
}
if (
  manifest.selections?.length !== 7 ||
  manifest.selections.some((item) => item.tracks?.length !== 25)
) {
  throw new Error("Expected seven approved groups of 25 tracks");
}

const quote = (value) => (value == null ? "NULL" : `'${String(value).replaceAll("'", "''")}'`);
const chunks = (items, size = 100) => {
  const result = [];
  for (let index = 0; index < items.length; index += size)
    result.push(items.slice(index, index + size));
  return result;
};

const sceneDefinitions = [
  {
    id: "972a65da-9be8-45ee-9822-71ad9984eb5a",
    slug: "bus-driver",
    titleEn: "Bus Driver",
    titleHi: "बस ड्राइवर",
    hook: "Catalogue staged; final visual copy pending.",
    region: "Pan India",
    artKey: "bus-driver",
    sortOrder: 2,
    tags: ["safar", "shaam"],
  },
  {
    id: "ec4207f5-2a4d-45eb-af22-26974505b6af",
    slug: "bartan-time",
    titleEn: "Bartan Time",
    titleHi: "बर्तन टाइम",
    hook: "Catalogue staged; final visual copy pending.",
    region: "Pan India",
    artKey: "bartan-time",
    sortOrder: 4,
    tags: ["kaam", "yaadein"],
  },
  {
    id: "4f7e692a-4cca-451c-b2e8-1958b6d2d638",
    slug: "papa-ke-gaane",
    titleEn: "Papa Ke Gaane",
    titleHi: "पापा के गाने",
    hook: "Catalogue staged; final visual copy pending.",
    region: "Pan India",
    artKey: "papa-ke-gaane",
    sortOrder: 6,
    tags: ["shaam", "yaadein"],
  },
];

const setDefinitions = [
  {
    id: "8f382722-007c-481f-9b61-82332ee7aae8",
    slug: "deluxe-salon",
    sceneSlug: "nai-ki-dukaan",
    title: "Deluxe Salon — Seven Jagah Staged",
    order: 1,
    baseCount: 42,
    originId: "PLVFLMYM1tErk",
  },
  {
    id: "bb2cbc33-29d6-4945-ac7a-164ed1f49c8f",
    slug: "bus-driver",
    sceneSlug: "bus-driver",
    title: "Bus Driver — Seven Jagah Staged",
    order: 2,
    baseCount: 0,
    originId: "manual:bus-driver:2026-08-29",
  },
  {
    id: "fe42b40e-6b02-4b60-9ccb-06b1a7e1649d",
    slug: "bhojpuri-bangers",
    sceneSlug: "bhojpuriya-devara",
    title: "Bhojpuri Bangers — Seven Jagah Staged",
    order: 3,
    baseCount: 3649,
    originId: "PLwyqDgjhF4Qpq6kslMcQ8NR6RHb-Z4Tu-",
  },
  {
    id: "d425495b-9938-4a13-a9f0-6014cc3a611d",
    slug: "bartan-time",
    sceneSlug: "bartan-time",
    title: "Bartan Time — Seven Jagah Staged",
    order: 4,
    baseCount: 0,
    originId: "PLc1Byv6ESHSaag4naocpjBLSjO58i9MV5",
  },
  {
    id: "c44a6fb0-ae22-43fb-98b9-843472957d60",
    slug: "raju-mistri",
    sceneSlug: "raj-mistri",
    title: "Raju Mistri — Seven Jagah Staged",
    order: 5,
    baseCount: 328,
    originId: "PLTcrZKUys_a5zSgv_3ZHsRnTVJ05GbDvY",
  },
  {
    id: "359d7737-e012-4f5d-aec0-b0c3fc1faafb",
    slug: "papa-ke-gaane",
    sceneSlug: "papa-ke-gaane",
    title: "Papa Ke Gaane — Seven Jagah Staged",
    order: 6,
    baseCount: 0,
    originId: "PL3rJgr5HfVCrov_nZV_2ltKKFGWbbjATx",
  },
  {
    id: "d2d4c91e-5ac6-4bfd-bcba-299e60546b1f",
    slug: "corporate-majdoor",
    sceneSlug: "corporate-majdoor",
    title: "Corporate Majdoor — Seven Jagah Staged",
    order: 7,
    baseCount: 218,
    originId: "PLMqSYqU_UWQk",
  },
];

const selections = new Map(manifest.selections.map((selection) => [selection.slug, selection]));
for (const definition of setDefinitions) {
  if (!selections.has(definition.slug)) throw new Error(`Missing selection for ${definition.slug}`);
}
const uniqueTracks = new Map();
for (const selection of manifest.selections) {
  for (const track of selection.tracks) {
    if (!uniqueTracks.has(track.videoId)) uniqueTracks.set(track.videoId, track);
  }
}
if (uniqueTracks.size !== manifest.uniqueVideoCount) throw new Error("Unique video count mismatch");

const lines = [
  "-- Milestone 4.1: stage the approved seven-Jagah music catalogue without changing production.",
  `-- Approved manifest SHA-256: ${manifest.sha256}`,
  "SET lock_timeout = '10s';",
  "",
  "DO $$",
  "DECLARE",
  "  v_expected record;",
  "  v_actual integer;",
  "BEGIN",
  "  IF (SELECT count(*) FROM public.scenes WHERE is_live) <> 10 THEN",
  "    RAISE EXCEPTION 'preflight failed: expected ten live scenes';",
  "  END IF;",
  "  IF (SELECT count(*) FROM public.curated_sets WHERE is_active) <> 10 THEN",
  "    RAISE EXCEPTION 'preflight failed: expected ten active curated sets';",
  "  END IF;",
  "  FOR v_expected IN SELECT * FROM (VALUES",
  ...setDefinitions
    .filter((item) => item.baseCount > 0)
    .map(
      (item, index, items) =>
        `    (${quote(item.sceneSlug)}, ${item.baseCount})${index === items.length - 1 ? "" : ","}`,
    ),
  "  ) AS expected(slug, membership_count) LOOP",
  "    SELECT count(*) INTO v_actual",
  "    FROM public.curated_set_tracks cst",
  "    JOIN public.curated_sets cs ON cs.id = cst.curated_set_id",
  "    JOIN public.scenes s ON s.id = cs.scene_id",
  "    WHERE cs.is_active AND s.slug = v_expected.slug;",
  "    IF v_actual <> v_expected.membership_count THEN",
  "      RAISE EXCEPTION 'preflight failed for %: expected %, found %', v_expected.slug, v_expected.membership_count, v_actual;",
  "    END IF;",
  "  END LOOP;",
  "END $$;",
  "",
  "INSERT INTO public.scenes(id, slug, title_en, title_hi, hook, description, region, category, palette, art_key, is_dark, is_live, chat_mode, gag_label, sort_order, tags)",
  "VALUES",
  sceneDefinitions
    .map(
      (scene) =>
        `  (${quote(scene.id)}::uuid, ${quote(scene.slug)}, ${quote(scene.titleEn)}, ${quote(scene.titleHi)}, ${quote(scene.hook)}, NULL, ${quote(scene.region)}, 'tier1', '{}'::jsonb, ${quote(scene.artKey)}, true, false, 'closed', NULL, ${scene.sortOrder}, ARRAY[${scene.tags.map(quote).join(", ")}]::text[])`,
    )
    .join(",\n"),
  "ON CONFLICT (slug) DO NOTHING;",
  "",
  "INSERT INTO public.curated_sets(id, scene_id, title, sort_order, is_active, shuffle_start, origin_provider, origin_external_id, imported_at)",
  "SELECT v.id, s.id, v.title, v.sort_order, false, true, 'youtube', v.origin_external_id, '2026-08-29T09:58:08.299Z'::timestamptz",
  "FROM (VALUES",
  setDefinitions
    .map(
      (set) =>
        `  (${quote(set.id)}::uuid, ${quote(set.sceneSlug)}, ${quote(set.title)}, ${set.order}, ${quote(set.originId)})`,
    )
    .join(",\n"),
  ") AS v(id, scene_slug, title, sort_order, origin_external_id)",
  "JOIN public.scenes s ON s.slug = v.scene_slug",
  "ON CONFLICT (id) DO UPDATE SET",
  "  scene_id = EXCLUDED.scene_id,",
  "  title = EXCLUDED.title,",
  "  sort_order = EXCLUDED.sort_order,",
  "  is_active = false,",
  "  shuffle_start = EXCLUDED.shuffle_start,",
  "  origin_provider = EXCLUDED.origin_provider,",
  "  origin_external_id = EXCLUDED.origin_external_id,",
  "  imported_at = EXCLUDED.imported_at;",
  "",
];

for (const set of setDefinitions.filter((item) => item.baseCount > 0)) {
  lines.push(
    "INSERT INTO public.curated_set_tracks(curated_set_id, track_id, position, daypart_tag)",
    `SELECT ${quote(set.id)}::uuid, cst.track_id, cst.position, cst.daypart_tag`,
    "FROM public.curated_set_tracks cst",
    "JOIN public.curated_sets cs ON cs.id = cst.curated_set_id",
    "JOIN public.scenes s ON s.id = cs.scene_id",
    `WHERE cs.is_active AND s.slug = ${quote(set.sceneSlug)}`,
    "ON CONFLICT (curated_set_id, position) DO UPDATE SET",
    "  track_id = EXCLUDED.track_id, daypart_tag = EXCLUDED.daypart_tag;",
    "",
  );
}

for (const part of chunks([...uniqueTracks.values()])) {
  lines.push(
    "INSERT INTO public.tracks(catalogue_key, scene_id, title, artist, year, daypart_tag, sort_order)",
    "SELECT 'youtube:' || v.video_id, NULL, v.title, v.artist, v.year, 'all', 0",
    "FROM (VALUES",
    part
      .map(
        (track) =>
          `  (${quote(track.videoId)}, ${quote(track.canonicalTitle)}, ${quote(track.canonicalArtist)}, ${track.year == null ? "NULL" : Number(track.year)})`,
      )
      .join(",\n"),
    ") AS v(video_id, title, artist, year)",
    "WHERE NOT EXISTS (",
    "  SELECT 1 FROM public.playback_sources ps",
    "  WHERE ps.provider = 'youtube' AND ps.provider_item_id = v.video_id",
    ")",
    "ON CONFLICT (catalogue_key) DO NOTHING;",
    "",
    "INSERT INTO public.playback_sources(track_id, provider, provider_item_id, source_url, provider_title, provider_channel, priority, validated_at, is_active)",
    "SELECT t.id, 'youtube', v.video_id, 'https://www.youtube.com/watch?v=' || v.video_id, v.provider_title, v.provider_channel, 0, '2026-08-29T09:58:08.299Z'::timestamptz, true",
    "FROM (VALUES",
    part
      .map(
        (track) =>
          `  (${quote(track.videoId)}, ${quote(track.providerTitle)}, ${quote(track.providerChannel)})`,
      )
      .join(",\n"),
    ") AS v(video_id, provider_title, provider_channel)",
    "JOIN public.tracks t ON t.catalogue_key = 'youtube:' || v.video_id",
    "WHERE NOT EXISTS (",
    "  SELECT 1 FROM public.playback_sources ps",
    "  WHERE ps.provider = 'youtube' AND ps.provider_item_id = v.video_id",
    ");",
    "",
  );
}

for (const set of setDefinitions) {
  const selection = selections.get(set.slug);
  lines.push(
    "INSERT INTO public.curated_set_tracks(curated_set_id, track_id, position, daypart_tag)",
    `SELECT ${quote(set.id)}::uuid, ps.track_id, v.position, 'all'`,
    "FROM (VALUES",
    selection.tracks
      .map((track) => `  (${quote(track.videoId)}, ${set.baseCount + track.additionPosition})`)
      .join(",\n"),
    ") AS v(video_id, position)",
    "JOIN public.playback_sources ps ON ps.provider = 'youtube' AND ps.provider_item_id = v.video_id AND ps.is_active",
    "ON CONFLICT (curated_set_id, position) DO UPDATE SET",
    "  track_id = EXCLUDED.track_id, daypart_tag = EXCLUDED.daypart_tag;",
    "",
  );
}

lines.push(
  "DO $$",
  "DECLARE",
  "  v_expected record;",
  "  v_actual integer;",
  "BEGIN",
  "  IF (SELECT count(*) FROM public.scenes WHERE is_live) <> 10 THEN",
  "    RAISE EXCEPTION 'staging changed the live scene count';",
  "  END IF;",
  "  IF (SELECT count(*) FROM public.curated_sets WHERE is_active) <> 10 THEN",
  "    RAISE EXCEPTION 'staging changed the active set count';",
  "  END IF;",
  "  IF (SELECT count(*) FROM public.scenes WHERE slug IN ('bus-driver', 'bartan-time', 'papa-ke-gaane') AND NOT is_live) <> 3 THEN",
  "    RAISE EXCEPTION 'expected three hidden staged scenes';",
  "  END IF;",
  "  FOR v_expected IN SELECT * FROM (VALUES",
  ...setDefinitions.map(
    (item, index, items) =>
      `    (${quote(item.id)}::uuid, ${quote(item.slug)}, ${item.baseCount + 25})${index === items.length - 1 ? "" : ","}`,
  ),
  "  ) AS expected(set_id, slug, membership_count) LOOP",
  "    SELECT count(*) INTO v_actual FROM public.curated_set_tracks WHERE curated_set_id = v_expected.set_id;",
  "    IF v_actual <> v_expected.membership_count THEN",
  "      RAISE EXCEPTION 'staged count failed for %: expected %, found %', v_expected.slug, v_expected.membership_count, v_actual;",
  "    END IF;",
  "    IF (SELECT is_active FROM public.curated_sets WHERE id = v_expected.set_id) THEN",
  "      RAISE EXCEPTION 'staged set unexpectedly active: %', v_expected.slug;",
  "    END IF;",
  "  END LOOP;",
  "  IF EXISTS (",
  "    SELECT 1 FROM public.curated_set_tracks cst",
  "    LEFT JOIN public.playback_sources ps ON ps.track_id = cst.track_id AND ps.is_active",
  `    WHERE cst.curated_set_id IN (${setDefinitions.map((item) => `${quote(item.id)}::uuid`).join(", ")})`,
  "      AND ps.id IS NULL",
  "  ) THEN",
  "    RAISE EXCEPTION 'staged membership without an active playback source';",
  "  END IF;",
  "END $$;",
  "",
);

writeFileSync(migrationPath, `${lines.join("\n").trimEnd()}\n`);
console.log(
  JSON.stringify(
    {
      migrationPath,
      manifestSha256: manifest.sha256,
      stagedSets: setDefinitions.length,
      approvedAdditions: 175,
      uniqueVideos: uniqueTracks.size,
    },
    null,
    2,
  ),
);
