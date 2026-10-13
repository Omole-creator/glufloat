-- GluFloat for dietitians, 2026-10-13. #25 in SETUP.md. Paste once into the
-- Supabase SQL editor, AFTER hospitals-schema.sql (#22) and
-- hospital-chat-schema.sql (#23). Idempotent: safe to re-paste.
--
-- A dietitian's practice is a row in `hospitals` with kind = 'dietitian'. It
-- reuses everything a hospital has (patients, QR code, invites, the dashboard,
-- the patient's report), with three differences, all decided by the founder:
--
--   * She signs up herself at /dietitians/start with her DCN registration
--     number (`dcn_number`). GluFloat checks the number and can switch her
--     off in /admin/dietitians.
--   * 14 free days for 5 patients, and the 14 days start when her FIRST
--     patient joins (access_until stays null until then).
--   * She pays by Paystack: 5 patients N12,000, 10 for N22,000, 20 for
--     N40,000 a month. Those payments go to `practice_payments`, NEVER to
--     `payments`: a row in `payments` would be read as a patient's own
--     subscription, and would fire the partner trigger and the invite reward.

alter table public.hospitals add column if not exists kind text not null default 'hospital';
alter table public.hospitals drop constraint if exists hospitals_kind_check;
alter table public.hospitals add constraint hospitals_kind_check check (kind in ('hospital', 'dietitian'));

alter table public.hospitals add column if not exists dcn_number text;

-- The three dietitian plans join the hospital plans.
alter table public.hospitals drop constraint if exists hospitals_plan_check;
alter table public.hospitals add constraint hospitals_plan_check
  check (plan in ('pilot', 'care50', 'care100', 'care200', 'custom', 'diet5', 'diet10', 'diet20'));

create index if not exists hospitals_kind_idx on public.hospitals (kind);

-- One row per Paystack payment from a dietitian. The primary key on the
-- reference is the lock: the claim route and the webhook both see the same
-- payment, and only the one whose insert lands extends her plan.
create table if not exists public.practice_payments (
  reference    text primary key,
  hospital_id  uuid references public.hospitals (id) on delete set null,
  user_id      uuid references auth.users (id) on delete set null,
  amount       bigint not null check (amount > 0),   -- kobo
  plan         text not null,
  paid_at      timestamptz not null default now(),
  created_at   timestamptz not null default now()
);
create index if not exists practice_payments_hospital_idx on public.practice_payments (hospital_id, paid_at desc);

-- Server only, like every hospital table.
alter table public.practice_payments enable row level security;
