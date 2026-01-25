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

-- Create user table (singular for NextAuth)
CREATE TABLE "user" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" varchar(255),
  "email" varchar(255) NOT NULL UNIQUE,
  "email_verified" timestamp,
  "image" text,
  "role" user_role NOT NULL DEFAULT 'normal',
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);

-- Create account table
CREATE TABLE account (
  "user_id" uuid NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  "type" varchar(255) NOT NULL,
  "provider" varchar(255) NOT NULL,
  "provider_account_id" varchar(255) NOT NULL,
  "refresh_token" text,
  "access_token" text,
  "expires_at" integer,
  "token_type" varchar(255),
  "scope" varchar(255),
  "id_token" text,
  "session_state" varchar(255),
  PRIMARY KEY (provider, provider_account_id)
);

-- Create session table
CREATE TABLE session (
  "session_token" varchar(255) PRIMARY KEY,
  "user_id" uuid NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  "expires" timestamp NOT NULL
);

-- Create verification_token table
CREATE TABLE verification_token (
  "identifier" varchar(255) NOT NULL,
  "token" varchar(255) NOT NULL,
  "expires" timestamp NOT NULL,
  PRIMARY KEY (identifier, token)
);

-- Create polls table
CREATE TABLE polls (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "title" text NOT NULL,
  "description" text,
  "location" text,
  "creator_id" uuid NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  "unique_link" text NOT NULL UNIQUE,
  "status" poll_status NOT NULL DEFAULT 'active',
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);

-- Create slots table
CREATE TABLE slots (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "poll_id" uuid NOT NULL REFERENCES polls(id) ON DELETE CASCADE,
  "start_time" timestamp NOT NULL,
  "end_time" timestamp,
  "created_at" timestamp NOT NULL DEFAULT now()
);

-- Create participants table
CREATE TABLE participants (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "poll_id" uuid NOT NULL REFERENCES polls(id) ON DELETE CASCADE,
  "name" text NOT NULL,
  "email" text,
  "created_at" timestamp NOT NULL DEFAULT now()
);

-- Create votes table
CREATE TABLE votes (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "slot_id" uuid NOT NULL REFERENCES slots(id) ON DELETE CASCADE,
  "participant_id" uuid NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
  "vote_type" vote_type NOT NULL,
  "created_at" timestamp NOT NULL DEFAULT now(),
  UNIQUE (slot_id, participant_id)
);

-- Create comments table
CREATE TABLE comments (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "poll_id" uuid NOT NULL REFERENCES polls(id) ON DELETE CASCADE,
  "participant_id" uuid NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
  "content" text NOT NULL,
  "created_at" timestamp NOT NULL DEFAULT now()
);

-- Create indexes
CREATE INDEX user_email_idx ON "user"(email);
CREATE INDEX polls_creator_idx ON polls(creator_id);
CREATE INDEX polls_unique_link_idx ON polls(unique_link);
CREATE INDEX slots_poll_idx ON slots(poll_id);
CREATE INDEX participants_poll_idx ON participants(poll_id);
CREATE INDEX votes_slot_idx ON votes(slot_id);
CREATE INDEX votes_participant_idx ON votes(participant_id);
CREATE INDEX comments_poll_idx ON comments(poll_id);
