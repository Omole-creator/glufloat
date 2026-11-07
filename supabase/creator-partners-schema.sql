-- #41  Creator partners (2026-11-07). Paste once into the Supabase SQL editor.
-- Idempotent: safe to re-paste.
--
-- Founder's terms (2026-10-22, see CLAUDE.md "Creator partners"):
--   * A creator's link is glufloat.com/<code>, the code is their first name
--     (FAITH). The same code can be typed at sign-up, during the free week,
--     or on the plan picker, until the first payment.
--   * People who come through a creator get the normal 7-day free trial,
--     then 20% off their first 3 monthly payments.
--   * The creator earns 40% of what Glufloat received after Paystack's fee,
--     for 12 months from each person's first payment, every plan. 50% on new
--     payments once 50 of their people have paid.
--   * Paid monthly by bank transfer, by the 10th, on earnings at least 14
--     days old.
--
-- One person, one creator (primary key on user_id), first touch wins, and
-- never somebody a doctor acquisition rep's patient link already brought.
-- The money is written by the server (lib/creatorsServer.ts, from
-- lib/paymentGrant.ts, which runs exactly once per payment); the unique
-- reference on creator_earnings means a payment can never pay twice.
--
-- Server only: RLS on, no policies.

create table if not exists public.creators (
  id              uuid primary key default gen_random_uuid(),
  name            text not null,
  -- Upper case, letters and digits: FAITH. In the link glufloat.com/faith.
  code            text not null unique,
  phone           text,
  email           text,
  -- The creator's private dashboard: glufloat.com/creator/<dash_token>. Secret.
  dash_token      text not null unique,
  bank_name       text,
  bank_code       text,
  account_number  text,
  account_name    text,
  status          text not null default 'active' check (status in ('active', 'off')),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create table if not exists public.creator_users (
  user_id      uuid primary key references auth.users (id) on delete cascade,
  creator_id   uuid not null references public.creators (id) on delete cascade,
  -- 'link' (came through glufloat.com/<code>) or 'code' (typed it in).
  via          text not null default 'link' check (via in ('link', 'code')),
  attached_at  timestamptz not null default now()
);
create index if not exists creator_users_creator_idx on public.creator_users (creator_id);

create table if not exists public.creator_payouts (
  id          uuid primary key default gen_random_uuid(),
  creator_id  uuid references public.creators (id) on delete set null,
  amount      bigint not null check (amount > 0),   -- kobo
  reference   text not null unique,
  note        text,
  created_at  timestamptz not null default now()
);
create index if not exists creator_payouts_creator_idx on public.creator_payouts (creator_id, created_at desc);

create table if not exists public.creator_earnings (
  id              uuid primary key default gen_random_uuid(),
  -- The Paystack payment reference.
  reference       text not null unique,
  creator_id      uuid references public.creators (id) on delete set null,
  user_id         uuid references auth.users (id) on delete set null,
  payment_amount  bigint not null,   -- kobo, what the person paid
  paystack_fee    bigint not null,   -- kobo, estimated (lib/finance.ts paystackFee)
  rate            numeric not null,
  amount          bigint not null check (amount > 0),   -- kobo, the creator's share
  earned_at       timestamptz not null default now(),
  payout_id       uuid references public.creator_payouts (id) on delete set null
);
create index if not exists creator_earnings_creator_idx on public.creator_earnings (creator_id, earned_at desc);
create index if not exists creator_earnings_unpaid_idx on public.creator_earnings (payout_id) where payout_id is null;

alter table public.creators enable row level security;
alter table public.creator_users enable row level security;
alter table public.creator_payouts enable row level security;
alter table public.creator_earnings enable row level security;

grant select, insert, update, delete on public.creators to service_role;
grant select, insert, update, delete on public.creator_users to service_role;
grant select, insert, update, delete on public.creator_payouts to service_role;
grant select, insert, update, delete on public.creator_earnings to service_role;
