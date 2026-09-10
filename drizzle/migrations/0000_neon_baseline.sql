CREATE TABLE "ambience_asset_sources" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"asset_id" uuid NOT NULL,
	"source_order" integer DEFAULT 1 NOT NULL,
	"source_url" text,
	"source_title" text NOT NULL,
	"source_sha256" text NOT NULL,
	"original_filename" text,
	"original_byte_size" bigint,
	"original_duration_seconds" numeric,
	"selected_start_seconds" numeric,
	"selected_duration_seconds" numeric,
	CONSTRAINT "ambience_asset_sources_asset_id_source_order_key" UNIQUE("asset_id","source_order"),
	CONSTRAINT "ambience_asset_sources_original_byte_size_check" CHECK ((original_byte_size IS NULL) OR (original_byte_size > 0)),
	CONSTRAINT "ambience_asset_sources_original_duration_seconds_check" CHECK ((original_duration_seconds IS NULL) OR (original_duration_seconds > (0)::numeric)),
	CONSTRAINT "ambience_asset_sources_selected_duration_seconds_check" CHECK ((selected_duration_seconds IS NULL) OR (selected_duration_seconds > (0)::numeric)),
	CONSTRAINT "ambience_asset_sources_selected_start_seconds_check" CHECK ((selected_start_seconds IS NULL) OR (selected_start_seconds >= (0)::numeric)),
	CONSTRAINT "ambience_asset_sources_source_order_check" CHECK (source_order > 0),
	CONSTRAINT "ambience_asset_sources_source_sha256_check" CHECK (source_sha256 ~ '^[A-F0-9]{64}$'::text)
);
--> statement-breakpoint
CREATE TABLE "ambience_assets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"storage_path" text NOT NULL,
	"mime_type" text DEFAULT 'audio/wav' NOT NULL,
	"byte_size" bigint NOT NULL,
	"duration_seconds" numeric NOT NULL,
	"sha256" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ambience_assets_storage_path_key" UNIQUE("storage_path"),
	CONSTRAINT "ambience_assets_byte_size_check" CHECK ((byte_size > 0) AND (byte_size <= 12582912)),
	CONSTRAINT "ambience_assets_duration_seconds_check" CHECK (duration_seconds > (0)::numeric),
	CONSTRAINT "ambience_assets_sha256_check" CHECK (sha256 ~ '^[A-F0-9]{64}$'::text)
);
--> statement-breakpoint
CREATE TABLE "ambience_profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"scene_id" uuid NOT NULL,
	"enabled" boolean DEFAULT false NOT NULL,
	"max_master_gain" numeric DEFAULT '0.30' NOT NULL,
	"fade_out_ms" integer DEFAULT 700 NOT NULL,
	"fade_in_ms" integer DEFAULT 900 NOT NULL,
	"visual_theme" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"audio_theme" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"music_duck_ratio" numeric DEFAULT '0.40' NOT NULL,
	CONSTRAINT "ambience_profiles_scene_id_key" UNIQUE("scene_id"),
	CONSTRAINT "ambience_profiles_audio_theme_check" CHECK (jsonb_typeof(audio_theme) = 'object'::text),
	CONSTRAINT "ambience_profiles_fade_in_ms_check" CHECK ((fade_in_ms >= 0) AND (fade_in_ms <= 10000)),
	CONSTRAINT "ambience_profiles_fade_out_ms_check" CHECK ((fade_out_ms >= 0) AND (fade_out_ms <= 10000)),
	CONSTRAINT "ambience_profiles_max_master_gain_check" CHECK ((max_master_gain >= (0)::numeric) AND (max_master_gain <= (1)::numeric)),
	CONSTRAINT "ambience_profiles_music_duck_ratio_check" CHECK ((music_duck_ratio >= (0)::numeric) AND (music_duck_ratio <= (1)::numeric))
);
--> statement-breakpoint
CREATE TABLE "curated_set_tracks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"curated_set_id" uuid NOT NULL,
	"track_id" uuid NOT NULL,
	"position" integer NOT NULL,
	"daypart_tag" text DEFAULT 'all' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "curated_set_tracks_curated_set_id_position_key" UNIQUE("curated_set_id","position"),
	CONSTRAINT "curated_set_tracks_position_check" CHECK ("position" > 0)
);
--> statement-breakpoint
CREATE TABLE "curated_sets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"scene_id" uuid NOT NULL,
	"title" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"shuffle_start" boolean DEFAULT true NOT NULL,
	"origin_provider" text,
	"origin_external_id" text,
	"imported_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "oneliners" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"scene_id" uuid NOT NULL,
	"text_en" text NOT NULL,
	"text_hi" text,
	"daypart_tag" text DEFAULT 'all' NOT NULL,
	"weight" integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "playback_sources" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"track_id" uuid NOT NULL,
	"provider" text NOT NULL,
	"provider_item_id" text NOT NULL,
	"source_url" text NOT NULL,
	"provider_title" text,
	"provider_channel" text,
	"priority" integer DEFAULT 0 NOT NULL,
	"validated_at" timestamp with time zone NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "playback_sources_provider_provider_item_id_key" UNIQUE("provider","provider_item_id"),
	CONSTRAINT "playback_sources_provider_check" CHECK (provider = 'youtube'::text)
);
--> statement-breakpoint
CREATE TABLE "scenes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"title_en" text NOT NULL,
	"title_hi" text NOT NULL,
	"hook" text NOT NULL,
	"description" text,
	"region" text,
	"category" text DEFAULT 'tier1' NOT NULL,
	"palette" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"art_key" text NOT NULL,
	"is_dark" boolean DEFAULT false NOT NULL,
	"is_live" boolean DEFAULT true NOT NULL,
	"sponsor_id" uuid,
	"chat_mode" text DEFAULT 'open' NOT NULL,
	"gag_label" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"tags" text[] DEFAULT '{""}' NOT NULL,
	"background_storage_path" text,
	"foreground_text_color" text DEFAULT '#FFF3D6' NOT NULL,
	CONSTRAINT "scenes_slug_key" UNIQUE("slug"),
	CONSTRAINT "scenes_background_storage_path_safe" CHECK ((background_storage_path IS NULL) OR (background_storage_path ~ '^rooms/[a-z0-9-]+/background/[0-9a-f-]+.webp$'::text)),
	CONSTRAINT "scenes_foreground_text_color_hex" CHECK (foreground_text_color ~ '^#[0-9A-Fa-f]{6}$'::text)
);
--> statement-breakpoint
CREATE TABLE "sound_stems" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"scene_id" uuid,
	"name" text NOT NULL,
	"name_hi" text,
	"synth_key" text DEFAULT 'noise' NOT NULL,
	"loop_url" text,
	"default_volume" numeric DEFAULT '0.4' NOT NULL,
	"category" text DEFAULT 'ambient' NOT NULL,
	"asset_id" uuid,
	"role" text,
	"is_active" boolean DEFAULT false NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"min_gain" numeric DEFAULT '0.05' NOT NULL,
	"max_gain" numeric DEFAULT '0.20' NOT NULL,
	"crossfade_ms" integer DEFAULT 2500 NOT NULL,
	"event_min_seconds" integer,
	"event_max_seconds" integer,
	"loop_start_seconds" numeric(8, 3) DEFAULT '0' NOT NULL,
	"loop_end_seconds" numeric(8, 3),
	CONSTRAINT "sound_stems_loop_start_seconds_check" CHECK (loop_start_seconds >= (0)::numeric),
	CONSTRAINT "sound_stems_check" CHECK ((event_max_seconds IS NULL) OR (event_max_seconds >= event_min_seconds)),
	CONSTRAINT "sound_stems_check1" CHECK ((loop_end_seconds IS NULL) OR (loop_end_seconds > loop_start_seconds)),
	CONSTRAINT "sound_stems_crossfade_ms_check" CHECK ((crossfade_ms >= 0) AND (crossfade_ms <= 10000)),
	CONSTRAINT "sound_stems_event_min_seconds_check" CHECK ((event_min_seconds IS NULL) OR (event_min_seconds >= 5)),
	CONSTRAINT "sound_stems_max_gain_check" CHECK ((max_gain >= (0)::numeric) AND (max_gain <= (1)::numeric)),
	CONSTRAINT "sound_stems_min_gain_check" CHECK ((min_gain >= (0)::numeric) AND (min_gain <= (1)::numeric)),
	CONSTRAINT "sound_stems_role_check" CHECK (role = ANY (ARRAY['base'::text, 'texture'::text, 'event'::text]))
);
--> statement-breakpoint
CREATE TABLE "sponsors" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"logo_url" text,
	"brand_palette" jsonb DEFAULT '{}'::jsonb,
	"campaign_config" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tracks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"scene_id" uuid,
	"title" text NOT NULL,
	"artist" text,
	"year" integer,
	"youtube_id" text,
	"search_query" text,
	"spotify_url" text,
	"ytmusic_url" text,
	"daypart_tag" text DEFAULT 'all' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"catalogue_key" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ambience_asset_sources" ADD CONSTRAINT "ambience_asset_sources_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "public"."ambience_assets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ambience_profiles" ADD CONSTRAINT "ambience_profiles_scene_id_fkey" FOREIGN KEY ("scene_id") REFERENCES "public"."scenes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "curated_set_tracks" ADD CONSTRAINT "curated_set_tracks_curated_set_id_fkey" FOREIGN KEY ("curated_set_id") REFERENCES "public"."curated_sets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "curated_set_tracks" ADD CONSTRAINT "curated_set_tracks_track_id_fkey" FOREIGN KEY ("track_id") REFERENCES "public"."tracks"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "curated_sets" ADD CONSTRAINT "curated_sets_scene_id_fkey" FOREIGN KEY ("scene_id") REFERENCES "public"."scenes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "oneliners" ADD CONSTRAINT "oneliners_scene_id_fkey" FOREIGN KEY ("scene_id") REFERENCES "public"."scenes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "playback_sources" ADD CONSTRAINT "playback_sources_track_id_fkey" FOREIGN KEY ("track_id") REFERENCES "public"."tracks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scenes" ADD CONSTRAINT "scenes_sponsor_id_fkey" FOREIGN KEY ("sponsor_id") REFERENCES "public"."sponsors"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sound_stems" ADD CONSTRAINT "sound_stems_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "public"."ambience_assets"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sound_stems" ADD CONSTRAINT "sound_stems_scene_id_fkey" FOREIGN KEY ("scene_id") REFERENCES "public"."scenes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tracks" ADD CONSTRAINT "tracks_scene_id_fkey" FOREIGN KEY ("scene_id") REFERENCES "public"."scenes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ambience_asset_sources_asset_id_idx" ON "ambience_asset_sources" USING btree ("asset_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "ambience_assets_active_idx" ON "ambience_assets" USING btree ("is_active" bool_ops);--> statement-breakpoint
CREATE INDEX "ambience_profiles_scene_id_idx" ON "ambience_profiles" USING btree ("scene_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "curated_set_tracks_track_idx" ON "curated_set_tracks" USING btree ("track_id" uuid_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "curated_sets_one_active_per_scene" ON "curated_sets" USING btree ("scene_id" uuid_ops) WHERE is_active;--> statement-breakpoint
CREATE INDEX "curated_sets_scene_order_idx" ON "curated_sets" USING btree ("scene_id" uuid_ops,"sort_order" int4_ops);--> statement-breakpoint
CREATE INDEX "oneliners_scene_id_idx" ON "oneliners" USING btree ("scene_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "playback_sources_track_priority_idx" ON "playback_sources" USING btree ("track_id" uuid_ops,"is_active" bool_ops,"priority" int4_ops);--> statement-breakpoint
CREATE INDEX "scenes_sponsor_id_idx" ON "scenes" USING btree ("sponsor_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "sound_stems_active_scene_idx" ON "sound_stems" USING btree ("scene_id" uuid_ops,"is_active" bool_ops,"sort_order" int4_ops);--> statement-breakpoint
CREATE INDEX "sound_stems_asset_id_idx" ON "sound_stems" USING btree ("asset_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "sound_stems_scene_id_idx" ON "sound_stems" USING btree ("scene_id" uuid_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "tracks_catalogue_key_key" ON "tracks" USING btree ("catalogue_key" text_ops);--> statement-breakpoint
CREATE INDEX "tracks_scene_id_idx" ON "tracks" USING btree ("scene_id" uuid_ops);