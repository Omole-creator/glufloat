-- Push notification subscriptions. Run once in the Supabase SQL editor, AFTER
-- schema.sql.
--
-- Why: the habit we want is "open Glufloat before every meal". A reminder at
-- meal times is the strongest nudge toward it. Each device that says yes stores
-- its own push subscription here. The send route (app/api/push/send) reads them
-- with the service-role key and posts a message to each at meal times.
--
-- Honest limit worth remembering: not every phone can receive these. iPhones
-- only allow it after the app is added to the home screen, and some older
-- Android suppress them. That is why the in-app meal-time greeting is the
-- reliable baseline and this is the extra nudge.

create table if not exists public.push_subscriptions (
  id          bigint generated always as identity primary key,
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  endpoint    text not null unique,   -- the browser's push address; unique per device
  p256dh      text not null,          -- the device's public key
  auth        text not null,          -- the device's auth secret
  created_at  timestamptz not null default now()
);

create index if not exists push_subscriptions_user_idx
  on public.push_subscriptions (user_id);

-- Each person may write, read and remove only their own device rows. The send
-- route uses the service-role key, which bypasses RLS, so it can read every
-- subscription and delete the dead ones.
alter table public.push_subscriptions enable row level security;

drop policy if exists "own push select" on public.push_subscriptions;
drop policy if exists "own push insert" on public.push_subscriptions;
drop policy if exists "own push delete" on public.push_subscriptions;

create policy "own push select"
  on public.push_subscriptions for select using (auth.uid() = user_id);
create policy "own push insert"
  on public.push_subscriptions for insert with check (auth.uid() = user_id);
create policy "own push delete"
  on public.push_subscriptions for delete using (auth.uid() = user_id);
