CREATE SCHEMA "app_auth";
--> statement-breakpoint
CREATE TABLE "admin_auth_identities" (
	"auth_user_id" text PRIMARY KEY NOT NULL,
	"admin_user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "admin_auth_identities_admin_user_id_key" UNIQUE("admin_user_id")
);
--> statement-breakpoint
CREATE TABLE "app_auth"."account" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp,
	"refresh_token_expires_at" timestamp,
	"scope" text,
	"password" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "app_auth"."session" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "app_auth"."two_factor" (
	"id" text PRIMARY KEY NOT NULL,
	"secret" text NOT NULL,
	"backup_codes" text NOT NULL,
	"user_id" text NOT NULL,
	"verified" boolean DEFAULT true,
	"failed_verification_count" integer DEFAULT 0,
	"locked_until" timestamp
);
--> statement-breakpoint
CREATE TABLE "app_auth"."user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"two_factor_enabled" boolean DEFAULT false,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "app_auth"."verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "chat_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"room_key" text NOT NULL,
	"session_display_name" text NOT NULL,
	"text" text NOT NULL,
	"is_ai_host" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone DEFAULT now() + interval '45 minutes' NOT NULL,
	CONSTRAINT "chat_messages_room_key_check" CHECK (room_key ~ '^scene:[a-z0-9-]+$'::text),
	CONSTRAINT "chat_messages_display_name_check" CHECK (char_length(btrim(session_display_name)) between 1 and 50),
	CONSTRAINT "chat_messages_text_check" CHECK (char_length(btrim(text)) between 1 and 300),
	CONSTRAINT "chat_messages_expiry_after_created_check" CHECK (expires_at > created_at)
);
--> statement-breakpoint
ALTER TABLE "admin_auth_identities" ADD CONSTRAINT "admin_auth_identities_auth_user_id_user_id_fk" FOREIGN KEY ("auth_user_id") REFERENCES "app_auth"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "admin_auth_identities" ADD CONSTRAINT "admin_auth_identities_admin_user_id_app_admins_user_id_fk" FOREIGN KEY ("admin_user_id") REFERENCES "public"."app_admins"("user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app_auth"."account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "app_auth"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app_auth"."session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "app_auth"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app_auth"."two_factor" ADD CONSTRAINT "two_factor_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "app_auth"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "auth_account_user_id_idx" ON "app_auth"."account" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "auth_session_user_id_idx" ON "app_auth"."session" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "auth_two_factor_secret_idx" ON "app_auth"."two_factor" USING btree ("secret");--> statement-breakpoint
CREATE INDEX "auth_two_factor_user_id_idx" ON "app_auth"."two_factor" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "auth_verification_identifier_idx" ON "app_auth"."verification" USING btree ("identifier");--> statement-breakpoint
CREATE INDEX "chat_messages_room_created_idx" ON "chat_messages" USING btree ("room_key","created_at");--> statement-breakpoint
CREATE INDEX "chat_messages_expiry_idx" ON "chat_messages" USING btree ("expires_at");
--> statement-breakpoint
REVOKE ALL ON SCHEMA "app_auth" FROM PUBLIC;
--> statement-breakpoint
DO $$
BEGIN
	IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'music_app_runtime') THEN
		GRANT USAGE ON SCHEMA "app_auth" TO music_app_runtime;
		GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA "app_auth" TO music_app_runtime;
		GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "public"."admin_auth_identities", "public"."chat_messages" TO music_app_runtime;
	END IF;
END $$;
