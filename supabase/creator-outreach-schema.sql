-- #36  Creator outreach: every health creator we have emailed (2026-10-26).
--
-- Founder: creator partnership emails go out automatically from
-- glufloat@gmail.com (a scheduled Claude job, 5 emails on days 1, 4, 8, 13
-- and 19, stopped by any reply). Each creator emailed is one row here, shown
-- folded on /admin/creators with Edit and Delete.
--
-- Written and read only by the server (service role), through
-- /api/admin/creators: the admin cookie, or the job's secret header
-- (CREATOR_OUTREACH_SECRET). RLS on, no policies: nobody can read it from a
-- browser. Idempotent: safe to run twice.

create table if not exists public.creator_outreach (
  id             uuid primary key default gen_random_uuid(),
  name           text not null,
  email          text not null unique,
  platform       text,
  handle         text,
  research       text,
  status         text not null default 'emailing'
                 check (status in ('emailing', 'replied', 'yes', 'no', 'stopped', 'bounced')),
  step           int not null default 0 check (step between 0 and 5),
  first_sent_at  timestamptz,
  next_due_at    timestamptz,
  thread_id      text,
  emails         jsonb not null default '[]'::jsonb,
  reply_summary  text,
  notes          text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index if not exists creator_outreach_due_idx on public.creator_outreach (next_due_at);

alter table public.creator_outreach enable row level security;

grant select, insert, update, delete on public.creator_outreach to service_role;
