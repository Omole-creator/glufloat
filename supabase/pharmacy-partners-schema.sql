-- #42  Pharmacy partners + link visits (2026-11-18). Paste once into the
-- Supabase SQL editor, AFTER creator-partners-schema.sql (#41).
-- Idempotent: safe to re-paste.
--
-- A pharmacy is a creator partner with kind = 'pharmacy' (founder,
-- 2026-11-18): same code, link, 20% off, 40% share, payout and private page.
-- One row per BRANCH, paid to the pharmacy business's own bank account.
-- Reps do not recruit or earn from pharmacies.
--
-- creator_link_visits: one row per device per partner, the first time that
-- device opens glufloat.com/<code> (the poster's QR code, or typed). Counts
-- only, no person, no IP address.
--
-- Server only: RLS on, no policies.

alter table public.creators add column if not exists kind text not null default 'creator';
alter table public.creators drop constraint if exists creators_kind_check;
alter table public.creators add constraint creators_kind_check check (kind in ('creator', 'pharmacy'));
alter table public.creators add column if not exists branch text;
alter table public.creators add column if not exists address text;
alter table public.creators add column if not exists contact_name text;

create table if not exists public.creator_link_visits (
  id          uuid primary key default gen_random_uuid(),
  creator_id  uuid not null references public.creators (id) on delete cascade,
  visited_at  timestamptz not null default now()
);
create index if not exists creator_link_visits_creator_idx on public.creator_link_visits (creator_id, visited_at desc);

alter table public.creator_link_visits enable row level security;
grant select, insert, update, delete on public.creator_link_visits to service_role;
