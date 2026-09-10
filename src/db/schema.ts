import { pgTable, index, unique, check, uuid, text, bigint, numeric, boolean, timestamp, foreignKey, integer, jsonb, uniqueIndex, date, primaryKey } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"



export const appAdmins = pgTable("app_admins", {
	userId: uuid("user_id").primaryKey().notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
});

export const ambienceAssets = pgTable("ambience_assets", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	storagePath: text("storage_path").notNull(),
	mimeType: text("mime_type").default('audio/wav').notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	byteSize: bigint("byte_size", { mode: "number" }).notNull(),
	durationSeconds: numeric("duration_seconds").notNull(),
	sha256: text().notNull(),
	isActive: boolean("is_active").default(true).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("ambience_assets_active_idx").using("btree", table.isActive.asc().nullsLast().op("bool_ops")),
	unique("ambience_assets_storage_path_key").on(table.storagePath),
	check("ambience_assets_byte_size_check", sql`(byte_size > 0) AND (byte_size <= 12582912)`),
	check("ambience_assets_duration_seconds_check", sql`duration_seconds > (0)::numeric`),
	check("ambience_assets_sha256_check", sql`sha256 ~ '^[A-F0-9]{64}$'::text`),
]);

export const ambienceAssetSources = pgTable("ambience_asset_sources", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	assetId: uuid("asset_id").notNull(),
	sourceOrder: integer("source_order").default(1).notNull(),
	sourceUrl: text("source_url"),
	sourceTitle: text("source_title").notNull(),
	sourceSha256: text("source_sha256").notNull(),
	originalFilename: text("original_filename"),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	originalByteSize: bigint("original_byte_size", { mode: "number" }),
	originalDurationSeconds: numeric("original_duration_seconds"),
	selectedStartSeconds: numeric("selected_start_seconds"),
	selectedDurationSeconds: numeric("selected_duration_seconds"),
}, (table) => [
	index("ambience_asset_sources_asset_id_idx").using("btree", table.assetId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.assetId],
			foreignColumns: [ambienceAssets.id],
			name: "ambience_asset_sources_asset_id_fkey"
		}).onDelete("cascade"),
	unique("ambience_asset_sources_asset_id_source_order_key").on(table.assetId, table.sourceOrder),
	check("ambience_asset_sources_original_byte_size_check", sql`(original_byte_size IS NULL) OR (original_byte_size > 0)`),
	check("ambience_asset_sources_original_duration_seconds_check", sql`(original_duration_seconds IS NULL) OR (original_duration_seconds > (0)::numeric)`),
	check("ambience_asset_sources_selected_duration_seconds_check", sql`(selected_duration_seconds IS NULL) OR (selected_duration_seconds > (0)::numeric)`),
	check("ambience_asset_sources_selected_start_seconds_check", sql`(selected_start_seconds IS NULL) OR (selected_start_seconds >= (0)::numeric)`),
	check("ambience_asset_sources_source_order_check", sql`source_order > 0`),
	check("ambience_asset_sources_source_sha256_check", sql`source_sha256 ~ '^[A-F0-9]{64}$'::text`),
]);

export const scenes = pgTable("scenes", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	slug: text().notNull(),
	titleEn: text("title_en").notNull(),
	titleHi: text("title_hi").notNull(),
	hook: text().notNull(),
	description: text(),
	region: text(),
	category: text().default('tier1').notNull(),
	palette: jsonb().default({}).notNull(),
	artKey: text("art_key").notNull(),
	isDark: boolean("is_dark").default(false).notNull(),
	isLive: boolean("is_live").default(true).notNull(),
	sponsorId: uuid("sponsor_id"),
	chatMode: text("chat_mode").default('open').notNull(),
	gagLabel: text("gag_label"),
	sortOrder: integer("sort_order").default(0).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	tags: text().array().default([""]).notNull(),
	backgroundStoragePath: text("background_storage_path"),
	foregroundTextColor: text("foreground_text_color").default('#FFF3D6').notNull(),
}, (table) => [
	index("scenes_sponsor_id_idx").using("btree", table.sponsorId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.sponsorId],
			foreignColumns: [sponsors.id],
			name: "scenes_sponsor_id_fkey"
		}).onDelete("set null"),
	unique("scenes_slug_key").on(table.slug),
	check("scenes_background_storage_path_safe", sql`(background_storage_path IS NULL) OR (background_storage_path ~ '^rooms/[a-z0-9-]+/background/[0-9a-f-]+\.webp$'::text)`),
	check("scenes_foreground_text_color_hex", sql`foreground_text_color ~ '^#[0-9A-Fa-f]{6}$'::text`),
]);

export const ambienceProfiles = pgTable("ambience_profiles", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	sceneId: uuid("scene_id").notNull(),
	enabled: boolean().default(false).notNull(),
	maxMasterGain: numeric("max_master_gain").default('0.30').notNull(),
	fadeOutMs: integer("fade_out_ms").default(700).notNull(),
	fadeInMs: integer("fade_in_ms").default(900).notNull(),
	visualTheme: jsonb("visual_theme").default({}).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	audioTheme: jsonb("audio_theme").default({}).notNull(),
	musicDuckRatio: numeric("music_duck_ratio").default('0.40').notNull(),
}, (table) => [
	index("ambience_profiles_scene_id_idx").using("btree", table.sceneId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.sceneId],
			foreignColumns: [scenes.id],
			name: "ambience_profiles_scene_id_fkey"
		}).onDelete("cascade"),
	unique("ambience_profiles_scene_id_key").on(table.sceneId),
	check("ambience_profiles_audio_theme_check", sql`jsonb_typeof(audio_theme) = 'object'::text`),
	check("ambience_profiles_fade_in_ms_check", sql`(fade_in_ms >= 0) AND (fade_in_ms <= 10000)`),
	check("ambience_profiles_fade_out_ms_check", sql`(fade_out_ms >= 0) AND (fade_out_ms <= 10000)`),
	check("ambience_profiles_max_master_gain_check", sql`(max_master_gain >= (0)::numeric) AND (max_master_gain <= (1)::numeric)`),
	check("ambience_profiles_music_duck_ratio_check", sql`(music_duck_ratio >= (0)::numeric) AND (music_duck_ratio <= (1)::numeric)`),
]);

export const curatedSets = pgTable("curated_sets", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	sceneId: uuid("scene_id").notNull(),
	title: text().notNull(),
	sortOrder: integer("sort_order").default(0).notNull(),
	isActive: boolean("is_active").default(true).notNull(),
	shuffleStart: boolean("shuffle_start").default(true).notNull(),
	originProvider: text("origin_provider"),
	originExternalId: text("origin_external_id"),
	importedAt: timestamp("imported_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	uniqueIndex("curated_sets_one_active_per_scene").using("btree", table.sceneId.asc().nullsLast().op("uuid_ops")).where(sql`is_active`),
	index("curated_sets_scene_order_idx").using("btree", table.sceneId.asc().nullsLast().op("uuid_ops"), table.sortOrder.asc().nullsLast().op("int4_ops")),
	foreignKey({
			columns: [table.sceneId],
			foreignColumns: [scenes.id],
			name: "curated_sets_scene_id_fkey"
		}).onDelete("cascade"),
]);

export const curatedSetTracks = pgTable("curated_set_tracks", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	curatedSetId: uuid("curated_set_id").notNull(),
	trackId: uuid("track_id").notNull(),
	position: integer().notNull(),
	daypartTag: text("daypart_tag").default('all').notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("curated_set_tracks_track_idx").using("btree", table.trackId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.curatedSetId],
			foreignColumns: [curatedSets.id],
			name: "curated_set_tracks_curated_set_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.trackId],
			foreignColumns: [tracks.id],
			name: "curated_set_tracks_track_id_fkey"
		}).onDelete("restrict"),
	unique("curated_set_tracks_curated_set_id_position_key").on(table.curatedSetId, table.position),
	check("curated_set_tracks_position_check", sql`"position" > 0`),
]);

export const tracks = pgTable("tracks", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	sceneId: uuid("scene_id"),
	title: text().notNull(),
	artist: text(),
	year: integer(),
	youtubeId: text("youtube_id"),
	searchQuery: text("search_query"),
	spotifyUrl: text("spotify_url"),
	ytmusicUrl: text("ytmusic_url"),
	daypartTag: text("daypart_tag").default('all').notNull(),
	sortOrder: integer("sort_order").default(0).notNull(),
	catalogueKey: text("catalogue_key").notNull(),
}, (table) => [
	uniqueIndex("tracks_catalogue_key_key").using("btree", table.catalogueKey.asc().nullsLast().op("text_ops")),
	index("tracks_scene_id_idx").using("btree", table.sceneId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.sceneId],
			foreignColumns: [scenes.id],
			name: "tracks_scene_id_fkey"
		}).onDelete("cascade"),
]);

export const oneliners = pgTable("oneliners", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	sceneId: uuid("scene_id").notNull(),
	textEn: text("text_en").notNull(),
	textHi: text("text_hi"),
	daypartTag: text("daypart_tag").default('all').notNull(),
	weight: integer().default(1).notNull(),
}, (table) => [
	index("oneliners_scene_id_idx").using("btree", table.sceneId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.sceneId],
			foreignColumns: [scenes.id],
			name: "oneliners_scene_id_fkey"
		}).onDelete("cascade"),
]);

export const playbackSources = pgTable("playback_sources", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	trackId: uuid("track_id").notNull(),
	provider: text().notNull(),
	providerItemId: text("provider_item_id").notNull(),
	sourceUrl: text("source_url").notNull(),
	providerTitle: text("provider_title"),
	providerChannel: text("provider_channel"),
	priority: integer().default(0).notNull(),
	validatedAt: timestamp("validated_at", { withTimezone: true, mode: 'string' }).notNull(),
	isActive: boolean("is_active").default(true).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("playback_sources_track_priority_idx").using("btree", table.trackId.asc().nullsLast().op("uuid_ops"), table.isActive.asc().nullsLast().op("bool_ops"), table.priority.asc().nullsLast().op("int4_ops")),
	foreignKey({
			columns: [table.trackId],
			foreignColumns: [tracks.id],
			name: "playback_sources_track_id_fkey"
		}).onDelete("cascade"),
	unique("playback_sources_provider_provider_item_id_key").on(table.provider, table.providerItemId),
	check("playback_sources_provider_check", sql`provider = 'youtube'::text`),
]);

export const roomVisits = pgTable("room_visits", {
	id: uuid().primaryKey().notNull(),
	sceneId: uuid("scene_id").notNull(),
	startedAt: timestamp("started_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	firstPlayedAt: timestamp("first_played_at", { withTimezone: true, mode: 'string' }),
	lastHeartbeatAt: timestamp("last_heartbeat_at", { withTimezone: true, mode: 'string' }),
	listeningSeconds: integer("listening_seconds").default(0).notNull(),
}, (table) => [
	index("room_visits_scene_started_idx").using("btree", table.sceneId.asc().nullsLast().op("uuid_ops"), table.startedAt.desc().nullsFirst().op("timestamptz_ops")),
	index("room_visits_started_idx").using("btree", table.startedAt.desc().nullsFirst().op("timestamptz_ops")),
	foreignKey({
		columns: [table.sceneId],
		foreignColumns: [scenes.id],
		name: "room_visits_scene_id_fkey"
	}).onDelete("cascade"),
	check("room_visits_listening_seconds_check", sql`listening_seconds >= 0`),
	check("room_visits_last_heartbeat_check", sql`(last_heartbeat_at IS NULL) OR (last_heartbeat_at >= started_at)`),
]);

export const playbackSourceFailures = pgTable("playback_source_failures", {
	sourceId: uuid("source_id").notNull(),
	errorCode: integer("error_code").notNull(),
	failedOn: date("failed_on", { mode: 'string' }).default(sql`current_date`).notNull(),
	occurrenceCount: bigint("occurrence_count", { mode: "number" }).default(1).notNull(),
	firstSeenAt: timestamp("first_seen_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	lastSeenAt: timestamp("last_seen_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	primaryKey({ columns: [table.sourceId, table.errorCode, table.failedOn] }),
	foreignKey({
		columns: [table.sourceId],
		foreignColumns: [playbackSources.id],
		name: "playback_source_failures_source_id_fkey"
	}).onDelete("cascade"),
	check("playback_source_failures_error_code_check", sql`error_code = ANY (ARRAY[2, 5, 100, 101, 150, 153])`),
	check("playback_source_failures_occurrence_count_check", sql`occurrence_count > 0`),
]);

export const sponsors = pgTable("sponsors", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	name: text().notNull(),
	logoUrl: text("logo_url"),
	brandPalette: jsonb("brand_palette").default({}),
	campaignConfig: jsonb("campaign_config").default({}),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
});

export const soundStems = pgTable("sound_stems", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	sceneId: uuid("scene_id"),
	name: text().notNull(),
	nameHi: text("name_hi"),
	synthKey: text("synth_key").default('noise').notNull(),
	loopUrl: text("loop_url"),
	defaultVolume: numeric("default_volume").default('0.4').notNull(),
	category: text().default('ambient').notNull(),
	assetId: uuid("asset_id"),
	role: text(),
	isActive: boolean("is_active").default(false).notNull(),
	sortOrder: integer("sort_order").default(0).notNull(),
	minGain: numeric("min_gain").default('0.05').notNull(),
	maxGain: numeric("max_gain").default('0.20').notNull(),
	crossfadeMs: integer("crossfade_ms").default(2500).notNull(),
	eventMinSeconds: integer("event_min_seconds"),
	eventMaxSeconds: integer("event_max_seconds"),
	loopStartSeconds: numeric("loop_start_seconds", { precision: 8, scale:  3 }).default('0').notNull(),
	loopEndSeconds: numeric("loop_end_seconds", { precision: 8, scale:  3 }),
}, (table) => [
	index("sound_stems_active_scene_idx").using("btree", table.sceneId.asc().nullsLast().op("uuid_ops"), table.isActive.asc().nullsLast().op("bool_ops"), table.sortOrder.asc().nullsLast().op("int4_ops")),
	index("sound_stems_asset_id_idx").using("btree", table.assetId.asc().nullsLast().op("uuid_ops")),
	index("sound_stems_scene_id_idx").using("btree", table.sceneId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.assetId],
			foreignColumns: [ambienceAssets.id],
			name: "sound_stems_asset_id_fkey"
		}).onDelete("restrict"),
	foreignKey({
			columns: [table.sceneId],
			foreignColumns: [scenes.id],
			name: "sound_stems_scene_id_fkey"
		}).onDelete("cascade"),
	check("sound_stems_loop_start_seconds_check", sql`loop_start_seconds >= (0)::numeric`),
	check("sound_stems_check", sql`(event_max_seconds IS NULL) OR (event_max_seconds >= event_min_seconds)`),
	check("sound_stems_check1", sql`(loop_end_seconds IS NULL) OR (loop_end_seconds > loop_start_seconds)`),
	check("sound_stems_crossfade_ms_check", sql`(crossfade_ms >= 0) AND (crossfade_ms <= 10000)`),
	check("sound_stems_event_min_seconds_check", sql`(event_min_seconds IS NULL) OR (event_min_seconds >= 5)`),
	check("sound_stems_max_gain_check", sql`(max_gain >= (0)::numeric) AND (max_gain <= (1)::numeric)`),
	check("sound_stems_min_gain_check", sql`(min_gain >= (0)::numeric) AND (min_gain <= (1)::numeric)`),
	check("sound_stems_role_check", sql`role = ANY (ARRAY['base'::text, 'texture'::text, 'event'::text])`),
]);
