-- A person's own food-check history. Run once in the Supabase SQL editor, AFTER
-- schema.sql (it references auth.users and reuses the same RLS shape as profiles).
--
-- Why: the app behaved like a book you look a food up in once and never open
-- again. Saving each check lets the app remember a person: their recent meals, a
-- day-streak, and the "what did I eat this month" answer for their doctor. That
-- is what turns a lookup tool into a daily habit.
--
-- We store the traffic-light COLOUR only (green / yellow / red), never a number.
-- The colour is the whole verdict; there is no score.

create table if not exists public.meal_checks (
  -- user_id fills itself from the logged-in session, so the browser only ever
  -- sends the food and the colour. RLS below still checks it matches the caller.
  id          bigint generated always as identity primary key,
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  kind        text not null check (kind in ('single', 'meal')),  -- one food, or a whole plate
  label       text not null,                                     -- the food name, or the comma-joined meal
  verdict     text not null check (verdict in ('green', 'yellow', 'red')),
  checked_at  timestamptz not null default now()
);

create index if not exists meal_checks_user_time_idx
  on public.meal_checks (user_id, checked_at desc);

-- Row Level Security: each person sees and writes only their own rows, exactly
-- like profiles. No service-role, no server route: the browser client writes
-- directly under the session, and the policy is what keeps one person's log
-- private from everyone else.
alter table public.meal_checks enable row level security;

drop policy if exists "own checks select" on public.meal_checks;
drop policy if exists "own checks insert" on public.meal_checks;

create policy "own checks select"
  on public.meal_checks for select using (auth.uid() = user_id);
create policy "own checks insert"
  on public.meal_checks for insert with check (auth.uid() = user_id);
