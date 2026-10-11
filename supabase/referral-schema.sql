-- Invite a friend: 5 free days for the person who invited, once the friend pays.
-- Run in the Supabase SQL editor (supabase/SETUP.md §1, row 21). Safe to run twice.
--
-- Three tables, all written ONLY by the server (service-role key in the API
-- routes and the Paystack routes). There is deliberately no insert/update
-- policy: a person can read their own rows and nothing else, so nobody can
-- credit themselves or pick who invited them.

-- Each member's own invite code, made the first time they open the invite card.
create table if not exists public.referral_codes (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  code       text not null unique,
  created_at timestamptz not null default now()
);

-- Who invited whom. One row per invited person, first invite wins.
create table if not exists public.referrals (
  referred_user_id uuid primary key references auth.users(id) on delete cascade,
  referrer_user_id uuid not null references auth.users(id) on delete cascade,
  created_at       timestamptz not null default now(),
  check (referred_user_id <> referrer_user_id)
);
create index if not exists referrals_referrer_idx on public.referrals (referrer_user_id);

-- The reward, once per invited person (the primary key is what makes it once:
-- the Paystack webhook and the /unlock claim can both see the same payment, and
-- only the first insert wins).
create table if not exists public.referral_rewards (
  referred_user_id  uuid primary key references auth.users(id) on delete cascade,
  referrer_user_id  uuid not null references auth.users(id) on delete cascade,
  payment_reference text not null,
  days              integer not null default 5,
  applied_to        text not null default 'subscription', -- 'subscription' | 'trial'
  created_at        timestamptz not null default now()
);
create index if not exists referral_rewards_referrer_idx on public.referral_rewards (referrer_user_id);

alter table public.referral_codes   enable row level security;
alter table public.referrals        enable row level security;
alter table public.referral_rewards enable row level security;

drop policy if exists "own code" on public.referral_codes;
create policy "own code" on public.referral_codes for select using (auth.uid() = user_id);

drop policy if exists "own invites" on public.referrals;
create policy "own invites" on public.referrals for select using (auth.uid() = referrer_user_id);

drop policy if exists "own rewards" on public.referral_rewards;
create policy "own rewards" on public.referral_rewards for select using (auth.uid() = referrer_user_id);
