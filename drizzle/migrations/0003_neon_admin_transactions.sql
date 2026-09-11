CREATE SCHEMA "private";
--> statement-breakpoint
CREATE TABLE "admin_audit_log" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "admin_audit_log_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"actor_id" uuid NOT NULL,
	"action" text NOT NULL,
	"scene_id" uuid,
	"target_id" text,
	"affected_count" integer DEFAULT 0 NOT NULL,
	"request_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "admin_audit_log_action_check" CHECK (action ~ '^[a-z][a-z0-9_.-]{1,79}$'::text),
	CONSTRAINT "admin_audit_log_affected_count_check" CHECK (affected_count >= 0)
);
--> statement-breakpoint
CREATE TABLE "admin_rate_limits" (
	"actor_id" uuid NOT NULL,
	"bucket" text NOT NULL,
	"window_started_at" timestamp with time zone NOT NULL,
	"request_count" integer DEFAULT 1 NOT NULL,
	CONSTRAINT "admin_rate_limits_actor_id_bucket_window_started_at_pk" PRIMARY KEY("actor_id","bucket","window_started_at"),
	CONSTRAINT "admin_rate_limits_request_count_check" CHECK (request_count > 0)
);
--> statement-breakpoint
CREATE TABLE "admin_storage_cleanup_queue" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"bucket" text NOT NULL,
	"object_path" text NOT NULL,
	"reason" text NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"available_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	"last_error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "admin_storage_cleanup_queue_bucket_object_path_reason_key" UNIQUE("bucket","object_path","reason"),
	CONSTRAINT "admin_storage_cleanup_queue_bucket_check" CHECK (bucket = ANY (ARRAY['ambience-audio'::text, 'scene-media'::text])),
	CONSTRAINT "admin_storage_cleanup_queue_reason_check" CHECK (reason = ANY (ARRAY['expired_upload'::text, 'discarded_upload'::text, 'replaced_object'::text])),
	CONSTRAINT "admin_storage_cleanup_queue_attempts_check" CHECK (attempts >= 0)
);
--> statement-breakpoint
CREATE TABLE "admin_upload_reservations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor_id" uuid NOT NULL,
	"scene_id" uuid NOT NULL,
	"purpose" text NOT NULL,
	"bucket" text NOT NULL,
	"object_path" text NOT NULL,
	"expires_at" timestamp with time zone DEFAULT now() + interval '2 hours' NOT NULL,
	"finalized_at" timestamp with time zone,
	"discarded_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "admin_upload_reservations_object_path_key" UNIQUE("object_path"),
	CONSTRAINT "admin_upload_reservations_purpose_check" CHECK (purpose = ANY (ARRAY['ambience'::text, 'background'::text])),
	CONSTRAINT "admin_upload_reservations_bucket_check" CHECK (bucket = ANY (ARRAY['ambience-audio'::text, 'scene-media'::text])),
	CONSTRAINT "admin_upload_reservations_state_check" CHECK (finalized_at IS NULL OR discarded_at IS NULL)
);
--> statement-breakpoint
CREATE TABLE "private"."ambience_asset_provenance" (
	"asset_source_id" uuid PRIMARY KEY NOT NULL,
	"source_sha256" text NOT NULL,
	"original_filename" text,
	"original_byte_size" bigint,
	"original_duration_seconds" numeric,
	"selected_start_seconds" numeric,
	"selected_duration_seconds" numeric,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ambience_asset_provenance_source_sha256_check" CHECK (source_sha256 ~ '^[A-F0-9]{64}$'::text),
	CONSTRAINT "ambience_asset_provenance_original_byte_size_check" CHECK (original_byte_size IS NULL OR original_byte_size > 0),
	CONSTRAINT "ambience_asset_provenance_original_duration_seconds_check" CHECK (original_duration_seconds IS NULL OR original_duration_seconds > 0),
	CONSTRAINT "ambience_asset_provenance_selected_start_seconds_check" CHECK (selected_start_seconds IS NULL OR selected_start_seconds >= 0),
	CONSTRAINT "ambience_asset_provenance_selected_duration_seconds_check" CHECK (selected_duration_seconds IS NULL OR selected_duration_seconds > 0)
);
--> statement-breakpoint
CREATE TABLE "profiles" (
	"id" uuid PRIMARY KEY NOT NULL,
	"display_name" text,
	"avatar_url" text,
	"region_pref" text,
	"lang_pref" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "admin_audit_log" ADD CONSTRAINT "admin_audit_log_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "public"."app_admins"("user_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "admin_audit_log" ADD CONSTRAINT "admin_audit_log_scene_id_fkey" FOREIGN KEY ("scene_id") REFERENCES "public"."scenes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "admin_rate_limits" ADD CONSTRAINT "admin_rate_limits_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "public"."app_admins"("user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "admin_upload_reservations" ADD CONSTRAINT "admin_upload_reservations_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "public"."app_admins"("user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "admin_upload_reservations" ADD CONSTRAINT "admin_upload_reservations_scene_id_fkey" FOREIGN KEY ("scene_id") REFERENCES "public"."scenes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "private"."ambience_asset_provenance" ADD CONSTRAINT "ambience_asset_provenance_asset_source_id_fkey" FOREIGN KEY ("asset_source_id") REFERENCES "public"."ambience_asset_sources"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "public"."app_admins"("user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "admin_audit_log_created_idx" ON "admin_audit_log" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "admin_audit_log_actor_created_idx" ON "admin_audit_log" USING btree ("actor_id","created_at");--> statement-breakpoint
CREATE INDEX "admin_rate_limits_window_idx" ON "admin_rate_limits" USING btree ("window_started_at");--> statement-breakpoint
CREATE INDEX "admin_storage_cleanup_pending_idx" ON "admin_storage_cleanup_queue" USING btree ("available_at","created_at") WHERE completed_at IS NULL;--> statement-breakpoint
CREATE INDEX "admin_upload_reservations_expiry_idx" ON "admin_upload_reservations" USING btree ("expires_at") WHERE finalized_at IS NULL AND discarded_at IS NULL;--> statement-breakpoint
CREATE INDEX "admin_upload_reservations_actor_idx" ON "admin_upload_reservations" USING btree ("actor_id");