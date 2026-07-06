-- Adds the Notes and Planner/Events features ported from the reference apps.
-- The app runs on in-memory storage by default (no DATABASE_URL). This migration
-- is only needed when a real Postgres database is configured.
-- Preferred: run `npm run db:push` (drizzle-kit) to sync the schema automatically.
-- Or apply this file manually with psql. It is idempotent.

CREATE TABLE IF NOT EXISTS "notes" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"title" text DEFAULT 'Untitled' NOT NULL,
	"content" text DEFAULT '' NOT NULL,
	"color" text DEFAULT 'default',
	"pinned" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "events" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"start_time" timestamp NOT NULL,
	"duration" integer DEFAULT 30 NOT NULL,
	"type" text DEFAULT 'task' NOT NULL,
	"priority" text DEFAULT 'medium' NOT NULL,
	"location" text,
	"google_event_id" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);

DO $$ BEGIN
	ALTER TABLE "notes" ADD CONSTRAINT "notes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
	ALTER TABLE "events" ADD CONSTRAINT "events_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
