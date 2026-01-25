-- Case-insensitive email lookup indexes
-- Run once on the Postgres database.

create index if not exists idx_user_email_lower on "user" (lower(email));
create index if not exists idx_participants_email_lower on participants (lower(email));
create index if not exists idx_verificationtoken_identifier_lower on "verificationToken" (lower(identifier));
