-- Adds a dedicated Cerebras provider key to the users table.
-- The app runs on in-memory storage by default (no DATABASE_URL). This migration
-- is only needed when a real Postgres database is configured.
-- Preferred: run `npm run db:push` (drizzle-kit) to sync the schema automatically.
-- Or apply this file manually with psql. It is idempotent.

ALTER TABLE "users"
ADD COLUMN IF NOT EXISTS "cerebras_key" text;
