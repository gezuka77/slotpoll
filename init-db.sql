-- Create users table
CREATE TABLE IF NOT EXISTS "users" (
  "id" text PRIMARY KEY NOT NULL,
  "name" text,
  "email" text NOT NULL,
  "emailVerified" timestamp,
  "image" text,
  "role" text DEFAULT 'normal' NOT NULL,
  "createdAt" timestamp DEFAULT now() NOT NULL
);

-- Create accounts table
CREATE TABLE IF NOT EXISTS "accounts" (
  "userId" text NOT NULL,
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
  PRIMARY KEY ("provider", "providerAccountId"),
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE
);

-- Create sessions table
CREATE TABLE IF NOT EXISTS "sessions" (
  "sessionToken" text PRIMARY KEY NOT NULL,
  "userId" text NOT NULL,
  "expires" timestamp NOT NULL,
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE
);

-- Create verification_tokens table
CREATE TABLE IF NOT EXISTS "verificationToken" (
  "identifier" text NOT NULL,
  "token" text NOT NULL,
  "expires" timestamp NOT NULL,
  PRIMARY KEY ("identifier", "token")
);

-- Create polls table
CREATE TABLE IF NOT EXISTS "polls" (
  "id" text PRIMARY KEY NOT NULL,
  "title" text NOT NULL,
  "description" text,
  "location" text,
  "creatorId" text NOT NULL,
  "uniqueLink" text NOT NULL UNIQUE,
  "status" text DEFAULT 'active' NOT NULL,
  "createdAt" timestamp DEFAULT now() NOT NULL,
  "updatedAt" timestamp DEFAULT now() NOT NULL,
  FOREIGN KEY ("creatorId") REFERENCES "users"("id") ON DELETE CASCADE
);

-- Create slots table
CREATE TABLE IF NOT EXISTS "slots" (
  "id" text PRIMARY KEY NOT NULL,
  "pollId" text NOT NULL,
  "startTime" timestamp NOT NULL,
  "endTime" timestamp,
  "createdAt" timestamp DEFAULT now() NOT NULL,
  FOREIGN KEY ("pollId") REFERENCES "polls"("id") ON DELETE CASCADE
);

-- Create participants table
CREATE TABLE IF NOT EXISTS "participants" (
  "id" text PRIMARY KEY NOT NULL,
  "pollId" text NOT NULL,
  "name" text NOT NULL,
  "email" text,
  "createdAt" timestamp DEFAULT now() NOT NULL,
  FOREIGN KEY ("pollId") REFERENCES "polls"("id") ON DELETE CASCADE
);

-- Create votes table
CREATE TABLE IF NOT EXISTS "votes" (
  "id" text PRIMARY KEY NOT NULL,
  "slotId" text NOT NULL,
  "participantId" text NOT NULL,
  "voteType" text NOT NULL,
  "createdAt" timestamp DEFAULT now() NOT NULL,
  FOREIGN KEY ("slotId") REFERENCES "slots"("id") ON DELETE CASCADE,
  FOREIGN KEY ("participantId") REFERENCES "participants"("id") ON DELETE CASCADE,
  UNIQUE ("slotId", "participantId")
);

-- Create comments table
CREATE TABLE IF NOT EXISTS "comments" (
  "id" text PRIMARY KEY NOT NULL,
  "pollId" text NOT NULL,
  "participantId" text NOT NULL,
  "content" text NOT NULL,
  "createdAt" timestamp DEFAULT now() NOT NULL,
  FOREIGN KEY ("pollId") REFERENCES "polls"("id") ON DELETE CASCADE,
  FOREIGN KEY ("participantId") REFERENCES "participants"("id") ON DELETE CASCADE
);

-- Create indexes
CREATE INDEX IF NOT EXISTS "users_email_idx" ON "users"("email");
CREATE INDEX IF NOT EXISTS "polls_creator_idx" ON "polls"("creatorId");
CREATE INDEX IF NOT EXISTS "polls_unique_link_idx" ON "polls"("uniqueLink");
CREATE INDEX IF NOT EXISTS "slots_poll_idx" ON "slots"("pollId");
CREATE INDEX IF NOT EXISTS "participants_poll_idx" ON "participants"("pollId");
CREATE INDEX IF NOT EXISTS "votes_slot_idx" ON "votes"("slotId");
CREATE INDEX IF NOT EXISTS "votes_participant_idx" ON "votes"("participantId");
CREATE INDEX IF NOT EXISTS "comments_poll_idx" ON "comments"("pollId");
