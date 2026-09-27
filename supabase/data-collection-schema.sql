-- The data a future model would learn from. Run once in the Supabase SQL
-- editor, after meal-calories-schema.sql (#15). Idempotent: safe to re-paste.
--
-- Nothing here changes what anybody sees or what advice the app gives. It only
-- keeps things the app already knows at the moment they happen, which cannot be
-- filled in later:
--
--   1. meal_checks.food_ids / .sizes  which foods were eaten, and how much.
--                                     `label` is display text and breaks the
--                                     moment a food is renamed.
--   2. meal_impressions               which plate the blue card showed, and
--                                     whether it was skipped, opened or eaten.
--   3. weight_history                 every weight a person saves, because
--                                     profiles.weight_kg is overwritten.
--   4. glucose_readings.context       whether a sugar test was taken before
--                                     eating, so a before/after pair can say
--                                     how much a meal raised it.
--   5. profiles.med_types             which diabetes medicine, not only when.
--   6. hba1c_results                  the 3-month sugar test a doctor gives.
--
-- Every write in the app degrades gracefully if this has not run yet: the
-- extra fields are dropped and the rest of the row still saves.

-- 1 -------------------------------------------------------------------------
alter table public.meal_checks add column if not exists food_ids text[];
alter table public.meal_checks add column if not exists sizes text[];

-- 2 -------------------------------------------------------------------------
create table if not exists public.meal_impressions (
  id             bigint generated always as identity primary key,
  user_id        uuid not null default auth.uid() references auth.users (id) on delete cascade,
  meal           text not null check (meal in ('breakfast', 'lunch', 'dinner')),
  day_key        text not null,                 -- the WAT day, as the app counts it
  plate_index    integer not null,              -- position in lib/nextMeal.ts IDEAS[meal]
  food_ids       text[] not null,
  action         text not null check (action in ('shown', 'skipped', 'details', 'eaten')),
  calorie_target integer,                        -- this meal's share, when one was set
  created_at     timestamptz not null default now()
);
create index if not exists meal_impressions_user_time_idx
  on public.meal_impressions (user_id, created_at desc);

alter table public.meal_impressions enable row level security;
drop policy if exists "own impressions insert" on public.meal_impressions;
create policy "own impressions insert"
  on public.meal_impressions for insert with check (auth.uid() = user_id);
-- No select policy: the app never reads these back. /admin reads them with the
-- service role.

-- 3 -------------------------------------------------------------------------
create table if not exists public.weight_history (
  id          bigint generated always as identity primary key,
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  weight_kg   numeric(5,1) not null check (weight_kg between 20 and 300),
  recorded_at timestamptz not null default now()
);
create index if not exists weight_history_user_time_idx
  on public.weight_history (user_id, recorded_at desc);

alter table public.weight_history enable row level security;
drop policy if exists "own weight select" on public.weight_history;
drop policy if exists "own weight insert" on public.weight_history;
create policy "own weight select"
  on public.weight_history for select using (auth.uid() = user_id);
create policy "own weight insert"
  on public.weight_history for insert with check (auth.uid() = user_id);

-- 4 -------------------------------------------------------------------------
alter table public.glucose_readings add column if not exists context text;
alter table public.glucose_readings drop constraint if exists glucose_readings_context_check;
alter table public.glucose_readings add constraint glucose_readings_context_check
  check (context is null or context in ('before_meal', 'after_meal', 'other'));

-- 5 -------------------------------------------------------------------------
alter table public.profiles add column if not exists med_types text[];

-- 6 -------------------------------------------------------------------------
-- Stored as a number and shown back as a number. Never graded, same rule as
-- every sugar test (see CLAUDE.md, "A number is NEVER graded").
create table if not exists public.hba1c_results (
  id         bigint generated always as identity primary key,
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  percent    numeric(4,1) not null check (percent between 3 and 20),
  tested_on  date not null,
  created_at timestamptz not null default now()
);
create index if not exists hba1c_results_user_idx
  on public.hba1c_results (user_id, tested_on desc);

alter table public.hba1c_results enable row level security;
drop policy if exists "own hba1c select" on public.hba1c_results;
drop policy if exists "own hba1c insert" on public.hba1c_results;
drop policy if exists "own hba1c delete" on public.hba1c_results;
create policy "own hba1c select"
  on public.hba1c_results for select using (auth.uid() = user_id);
create policy "own hba1c insert"
  on public.hba1c_results for insert with check (auth.uid() = user_id);
create policy "own hba1c delete"
  on public.hba1c_results for delete using (auth.uid() = user_id);
