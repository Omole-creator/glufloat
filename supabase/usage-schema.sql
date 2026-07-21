-- Product usage events, so the admin can see how people actually use the app.
-- Run once in the Supabase SQL editor, AFTER schema.sql.
--
-- This is NOT the food history. It is anonymous-ish counters of taps: how many
-- times people press "show me another food", how often they search, how often
-- the doctor report is made, and so on. It answers "do people find this useful?"
-- which sign-up numbers cannot.

create table if not exists public.usage_events (
  id          bigint generated always as identity primary key,
  user_id     uuid default auth.uid() references auth.users (id) on delete set null,
  event       text not null,      -- 'meal_reroll' | 'food_search' | 'meal_logged' | 'doctor_report' | 'channel_join' | 'check_this_meal'
  created_at  timestamptz not null default now()
);

create index if not exists usage_events_event_idx
  on public.usage_events (event, created_at desc);

-- A signed-in user may only write their own events. Nobody reads these through
-- the API; only the service-role admin dashboard does. So there is an insert
-- policy and, on purpose, NO select policy.
alter table public.usage_events enable row level security;

drop policy if exists "own usage insert" on public.usage_events;
create policy "own usage insert"
  on public.usage_events for insert with check (auth.uid() = user_id);
