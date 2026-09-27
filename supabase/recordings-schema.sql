-- Customer call recordings (/admin/recordings). Run once in the Supabase SQL
-- editor. Idempotent: safe to re-paste.
--
-- A call is between two phones, browser to browser. Each phone writes down its
-- own speaker's words as they talk, so every line already knows who said it.
-- The GluFloat phone also records the call audio in 30-second pieces.
--
--   call_sessions     one row per link sent to a customer
--   call_lines        the transcript, one row per sentence, labelled
--   call_audio_parts  the audio pieces, stored in the PRIVATE `call-audio`
--                     storage bucket (file storage, NOT this database)
--
-- RLS is on with NO policies, on purpose: nobody reads or writes these tables
-- from a browser. The admin routes check the admin cookie, the customer routes
-- check the call link's secret token, and both use the service role.

create table if not exists public.call_sessions (
  id               uuid primary key default gen_random_uuid(),
  token            text not null unique,          -- the secret in the customer's link
  customer_name    text not null,
  purpose          text not null,
  status           text not null default 'waiting' check (status in ('waiting', 'live', 'ended')),
  consent_at       timestamptz,                   -- when the customer agreed to be recorded
  started_at       timestamptz,
  ended_at         timestamptz,
  audio_bytes      bigint not null default 0,
  audio_deleted_at timestamptz,                   -- set when the audio was removed (by hand or to free space)
  created_at       timestamptz not null default now()
);

create table if not exists public.call_lines (
  id         bigint generated always as identity primary key,
  session_id uuid not null references public.call_sessions (id) on delete cascade,
  speaker    text not null check (speaker in ('glufloat', 'customer')),
  text       text not null,
  t_ms       integer not null default 0,          -- milliseconds after the call started
  edited     boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists call_lines_session_idx on public.call_lines (session_id, t_ms);

create table if not exists public.call_audio_parts (
  session_id uuid not null references public.call_sessions (id) on delete cascade,
  seq        integer not null,
  segment    integer not null default 0,          -- a new segment each time the recorder restarts (e.g. a reload)
  path       text not null,
  bytes      integer not null,
  mime       text not null default 'audio/webm',
  created_at timestamptz not null default now(),
  primary key (session_id, seq)
);

alter table public.call_sessions enable row level security;
alter table public.call_lines enable row level security;
alter table public.call_audio_parts enable row level security;

-- For a database that ran an earlier copy of this file.
alter table public.call_audio_parts add column if not exists segment integer not null default 0;

-- Added 2026-09-27: when the customer's phone cannot write their words down
-- live (an iPhone, say), the GluFloat phone also saves THEIR voice alone
-- ('customer' track), so it can be written down after the call. The normal
-- recording is the 'mix' track. start_ms is when that piece's recording began,
-- measured from the start of the call, so written-down lines land at the
-- right time.
alter table public.call_audio_parts add column if not exists track text not null default 'mix';
alter table public.call_audio_parts add column if not exists start_ms integer;
