CREATE TABLE "playback_source_failures" (
	"source_id" uuid NOT NULL,
	"error_code" integer NOT NULL,
	"failed_on" date DEFAULT current_date NOT NULL,
	"occurrence_count" bigint DEFAULT 1 NOT NULL,
	"first_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "playback_source_failures_source_id_error_code_failed_on_pk" PRIMARY KEY("source_id","error_code","failed_on"),
	CONSTRAINT "playback_source_failures_error_code_check" CHECK (error_code = ANY (ARRAY[2, 5, 100, 101, 150, 153])),
	CONSTRAINT "playback_source_failures_occurrence_count_check" CHECK (occurrence_count > 0)
);
--> statement-breakpoint
CREATE TABLE "room_visits" (
	"id" uuid PRIMARY KEY NOT NULL,
	"scene_id" uuid NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"first_played_at" timestamp with time zone,
	"last_heartbeat_at" timestamp with time zone,
	"listening_seconds" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "room_visits_listening_seconds_check" CHECK (listening_seconds >= 0),
	CONSTRAINT "room_visits_last_heartbeat_check" CHECK ((last_heartbeat_at IS NULL) OR (last_heartbeat_at >= started_at))
);
--> statement-breakpoint
ALTER TABLE "playback_source_failures" ADD CONSTRAINT "playback_source_failures_source_id_fkey" FOREIGN KEY ("source_id") REFERENCES "public"."playback_sources"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "room_visits" ADD CONSTRAINT "room_visits_scene_id_fkey" FOREIGN KEY ("scene_id") REFERENCES "public"."scenes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "room_visits_scene_started_idx" ON "room_visits" USING btree ("scene_id" uuid_ops,"started_at" timestamptz_ops DESC NULLS FIRST);--> statement-breakpoint
CREATE INDEX "room_visits_started_idx" ON "room_visits" USING btree ("started_at" timestamptz_ops DESC NULLS FIRST);
