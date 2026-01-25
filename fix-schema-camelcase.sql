-- Drop all tables
DROP TABLE IF EXISTS comments CASCADE;
DROP TABLE IF EXISTS votes CASCADE;
DROP TABLE IF EXISTS participants CASCADE;
DROP TABLE IF EXISTS slots CASCADE;
DROP TABLE IF EXISTS polls CASCADE;
DROP TABLE IF EXISTS session CASCADE;
DROP TABLE IF EXISTS verification_token CASCADE;
DROP TABLE IF EXISTS account CASCADE;
DROP TABLE IF EXISTS "user" CASCADE;

-- Drop enums
DROP TYPE IF EXISTS user_role CASCADE;
DROP TYPE IF EXISTS vote_type CASCADE;
DROP TYPE IF EXISTS poll_status CASCADE;

-- Create enums
CREATE TYPE user_role AS ENUM ('super_user', 'admin', 'normal');
CREATE TYPE vote_type AS ENUM ('yes', 'no', 'maybe');
CREATE TYPE poll_status AS ENUM ('draft', 'active', 'closed');

-- Create user table (with camelCase for NextAuth)
CREATE TABLE "user" (
  "id" text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "name" text,
  "email" text NOT NULL UNIQUE,
  "emailVerified" timestamp,
  "image" text,
  "role" user_role NOT NULL DEFAULT 'normal',
  "createdAt" timestamp NOT NULL DEFAULT now(),
  "updatedAt" timestamp NOT NULL DEFAULT now()
);

-- Create account table
CREATE TABLE account (
  "userId" text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  "type" text NOT NULL,
  "provider" text NOT NULL,
  "providerAccountId" text NOT NULL,
  "refresh_token" text,
  "access_token" text,
  "expires_at" integer,
  "token_type" text,
  "scope" text,
  "id_token" text,
  "session_state" text,
  PRIMARY KEY (provider, "providerAccountId")
);

-- Create session table
CREATE TABLE session (
  "sessionToken" text PRIMARY KEY,
  "userId" text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  "expires" timestamp NOT NULL
);

-- Create verification_token table
CREATE TABLE verification_token (
  "identifier" text NOT NULL,
  "token" text NOT NULL,
  "expires" timestamp NOT NULL,
  PRIMARY KEY (identifier, token)
);

-- Create polls table
CREATE TABLE polls (
  "id" text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "title" text NOT NULL,
  "description" text,
  "location" text,
  "creatorId" text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  "uniqueLink" text NOT NULL UNIQUE,
  "status" poll_status NOT NULL DEFAULT 'active',
  "createdAt" timestamp NOT NULL DEFAULT now(),
  "updatedAt" timestamp NOT NULL DEFAULT now()
);

-- Create slots table
CREATE TABLE slots (
  "id" text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "pollId" text NOT NULL REFERENCES polls(id) ON DELETE CASCADE,
  "startTime" timestamp NOT NULL,
  "endTime" timestamp,
  "createdAt" timestamp NOT NULL DEFAULT now()
);

-- Create participants table
CREATE TABLE participants (
  "id" text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "pollId" text NOT NULL REFERENCES polls(id) ON DELETE CASCADE,
  "name" text NOT NULL,
  "email" text,
  "createdAt" timestamp NOT NULL DEFAULT now()
);

-- Create votes table
CREATE TABLE votes (
  "id" text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "slotId" text NOT NULL REFERENCES slots(id) ON DELETE CASCADE,
  "participantId" text NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
  "voteType" vote_type NOT NULL,
  "createdAt" timestamp NOT NULL DEFAULT now(),
  UNIQUE ("slotId", "participantId")
);

-- Create comments table
CREATE TABLE comments (
  "id" text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "pollId" text NOT NULL REFERENCES polls(id) ON DELETE CASCADE,
  "participantId" text NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
  "content" text NOT NULL,
  "createdAt" timestamp NOT NULL DEFAULT now()
);

-- Create indexes
CREATE INDEX user_email_idx ON "user"(email);
CREATE INDEX polls_creator_idx ON polls("creatorId");
CREATE INDEX polls_unique_link_idx ON polls("uniqueLink");
CREATE INDEX slots_poll_idx ON slots("pollId");
CREATE INDEX participants_poll_idx ON participants("pollId");
CREATE INDEX votes_slot_idx ON votes("slotId");
CREATE INDEX votes_participant_idx ON votes("participantId");
CREATE INDEX comments_poll_idx ON comments("pollId");
