-- #20: Whether a person said yes to GluFloat emails (Mailyte).
--
-- Mailyte and the law (NDPA) only let us email people who said yes.
-- Sign-up never asked, so nobody is assumed to have said yes.
--   null  = not asked yet
--   true  = yes, email me
--   false = no (or stopped)
-- Asked inside /app, on the "My details" tab (components/EmailOptIn.tsx).
-- The existing own-row update policy on profiles (schema.sql) lets a person
-- change their own answer. /admin/email reads it with the service role.

alter table public.profiles
  add column if not exists email_updates boolean,
  add column if not exists email_updates_at timestamptz;
