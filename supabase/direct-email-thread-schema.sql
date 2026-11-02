-- #39  Conversations with hospitals, HMOs and anyone emailed from /admin/email
--      (2026-11-02).
--
-- Founder: when a hospital or HMO answers, read their whole reply on
-- /admin/email and answer it from there, so the conversation stays together
-- (in their inbox too) instead of being scattered across glufloat@gmail.com.
--
-- One row per message AFTER the first email (which stays in direct_emails):
--   direction 'in'  = their reply. Written by the reply-checking job, which
--                     reads glufloat@gmail.com (ImprovMX forwards replies to
--                     hmo@, hospital@, favour@, support@ there) and matches a
--                     reply by its In-Reply-To / References headers.
--   direction 'out' = our answer, sent from /admin/email through Mailyte from
--                     the same address, with In-Reply-To and References set
--                     so it threads under the earlier messages.
-- message_id is the email's own Message-ID header, unique, so the job can
-- never record the same reply twice.
--
-- Server only (service role). RLS on, no policies. Idempotent.

create table if not exists public.direct_email_messages (
  id           uuid primary key default gen_random_uuid(),
  email_id     uuid not null references public.direct_emails(id) on delete cascade,
  direction    text not null check (direction in ('in', 'out')),
  at           timestamptz not null default now(),
  from_email   text,
  from_name    text,
  to_email     text,
  cc           text,
  subject      text,
  -- Their reply as plain text, with the quoted earlier email cut off.
  body_text    text,
  -- Our answer as written in the editor (cleaned).
  html         text,
  message_id   text unique,
  in_reply_to  text,
  refs         text
);

create index if not exists direct_email_messages_email_idx on public.direct_email_messages (email_id, at);

alter table public.direct_email_messages enable row level security;

grant select, insert, update, delete on public.direct_email_messages to service_role;

-- "No answer needed": a reply that needs nothing from us (a thank you) stops
-- showing as waiting. A newer reply than this shows as waiting again.
alter table public.direct_emails add column if not exists done_at timestamptz;
