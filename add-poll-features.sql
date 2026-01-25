-- Add missing poll configuration columns
ALTER TABLE polls ADD COLUMN IF NOT EXISTS "allowComments" boolean NOT NULL DEFAULT true;
ALTER TABLE polls ADD COLUMN IF NOT EXISTS "allowMaybe" boolean NOT NULL DEFAULT true;
ALTER TABLE polls ADD COLUMN IF NOT EXISTS "requireName" boolean NOT NULL DEFAULT true;
ALTER TABLE polls ADD COLUMN IF NOT EXISTS "requireEmail" boolean NOT NULL DEFAULT false;
ALTER TABLE polls ADD COLUMN IF NOT EXISTS "isPublic" boolean NOT NULL DEFAULT true;
ALTER TABLE polls ADD COLUMN IF NOT EXISTS "deadline" timestamp;
ALTER TABLE polls ADD COLUMN IF NOT EXISTS "maxVotesPerParticipant" integer;
ALTER TABLE polls ADD COLUMN IF NOT EXISTS "password" text;
