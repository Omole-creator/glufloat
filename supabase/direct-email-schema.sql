-- #33  Emails to one hospital or HMO, sent from /admin/email (2026-10-19).
--
-- Founder: send a single email, with files attached, to one hospital or HMO
-- from hmo@, hospital@, favour@ or support@glufloat.com, and keep a list of
-- what was sent (with Delete and "Send again").
--
-- This table is only the LIST. The email itself goes through Mailyte. The
-- files are not kept here (only their names), so "Send again" asks for them
-- again. Sending works before this file is run; only the list waits for it.
--
-- Written and read only by the server (service role). RLS on, no policies:
-- nobody can read it from a browser. Idempotent: safe to run twice.

create table if not exists public.direct_emails (
  id           uuid primary key default gen_random_uuid(),
  sent_at      timestamptz not null default now(),
  from_email   text not null,
  to_name      text not null,
  to_email     text not null,
  cc           text,
  subject      text not null,
  html         text not null,
  attachments  text[] not null default '{}',
  message_id   text
);

create index if not exists direct_emails_sent_at_idx on public.direct_emails (sent_at desc);

alter table public.direct_emails enable row level security;
