-- Glufloat Phase-2 schema. Run this once in the Supabase SQL editor.
-- Model: Supabase Auth holds the login (email + password). We keep a `profiles`
-- row per user (name, trial start) and a `subscriptions` row driven by the
-- Paystack webhook. `payments` is an append-only log for revenue reporting.
--
-- Everything the admin dashboard needs (signups, trials, conversion, MRR,
-- churn, retention) is derivable from these three tables, so the founder sees
-- one screen instead of three apps.

-- 1. Profile per auth user -------------------------------------------------
create table if not exists public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  name         text not null,
  email        text not null,
  trial_start  timestamptz,                 -- set when they tap "Start free trial"
  created_at   timestamptz not null default now()
);

-- 2. Subscription per user (written only by the Paystack webhook) ----------
create table if not exists public.subscriptions (
  user_id               uuid primary key references auth.users (id) on delete cascade,
  status                text not null default 'none',  -- none | active | non-renewing | canceled | expired
  current_period_end    timestamptz,                    -- drives the 30-day countdown + churn
  amount                integer,                         -- kobo, e.g. 150000 = N1,500
  paystack_customer_code text,
  paystack_sub_code     text,
  updated_at            timestamptz not null default now()
);

-- 3. Payment log (append-only, for revenue) --------------------------------
create table if not exists public.payments (
  id          bigint generated always as identity primary key,
  user_id     uuid references auth.users (id) on delete set null,
  email       text,
  reference   text unique,
  amount      integer,          -- kobo
  status      text,             -- success | failed
  paid_at     timestamptz,
  created_at  timestamptz not null default now()
);

-- 4. Row Level Security -----------------------------------------------------
-- Users can see only their own rows. The webhook + admin use the service-role
-- key, which bypasses RLS, so no policy is needed for them.
alter table public.profiles      enable row level security;
alter table public.subscriptions enable row level security;
alter table public.payments      enable row level security;

drop policy if exists "own profile"      on public.profiles;
drop policy if exists "own subscription" on public.subscriptions;

create policy "own profile"
  on public.profiles for select using (auth.uid() = id);
create policy "own profile insert"
  on public.profiles for insert with check (auth.uid() = id);
create policy "own profile update"
  on public.profiles for update using (auth.uid() = id);

create policy "own subscription"
  on public.subscriptions for select using (auth.uid() = user_id);

-- 5. Auto-create a profile row on signup, copying the name from metadata ----
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, name, email)
  values (new.id, coalesce(new.raw_user_meta_data->>'name', ''), new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
