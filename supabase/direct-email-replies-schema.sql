-- #37  Know when a hospital, HMO or person replies (2026-10-27).
--
-- Founder: we must know when there is a response to an email sent from
-- /admin/email. Replies to hmo@, hospital@, favour@ and support@ are
-- forwarded by ImprovMX to glufloat@gmail.com. A scheduled Claude job reads
-- that inbox twice a day, finds replies from the people we emailed, marks the
-- email "Replied" here (with who replied and the first lines), and emails the
-- founder. The admin can also mark or unmark it by hand.
--
-- New columns on an existing table, so no new grants. Idempotent.

alter table public.direct_emails add column if not exists replied_at    timestamptz;
alter table public.direct_emails add column if not exists reply_from    text;
alter table public.direct_emails add column if not exists reply_snippet text;
-- The last time the job looked for a reply to this email.
alter table public.direct_emails add column if not exists checked_at    timestamptz;
