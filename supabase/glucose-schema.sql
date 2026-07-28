-- A person's own blood sugar readings, attached to the food they ate. Run once in
-- the Supabase SQL editor, AFTER meal-history-schema.sql (it references
-- meal_checks) and AFTER schema.sql (it alters profiles).
--
-- Why: the app could tell somebody what a food does to people in general. It
-- could not tell them what a food does to THEM. A reading beside the meal is the
-- one thing a competitor cannot copy, because it is the person's own body, and it
-- turns the doctor report from "what I ate" into "what I ate and what happened".
--
-- Three rules are built into the shape of this table, and each one is load-bearing:
--
--   1. meal_check_id is NULLABLE. A fasting reading and a random reading have no
--      meal, and those are most of what somebody who tests twice a week actually
--      has. Making the meal link compulsory would lock out the very users this is
--      for. It is also ON DELETE SET NULL, not cascade: removing a meal from the
--      record must never destroy a real measurement of a person's body.
--
--   2. We keep what was TYPED (value_raw + unit) as well as the converted number
--      (mgdl). The app works out the unit from the size of the number, and a
--      convert-and-discard column would make a detection bug permanent and
--      unfixable. mgdl is the canonical one, used for every comparison.
--
--   3. There is NO verdict column, and there must never be one. The green/yellow/
--      red rating belongs to food, where a dietitian stands behind it. Grading a
--      blood sugar number is a clinical judgement, which is both something we
--      cannot back up and the thing that would make Glufloat a regulated medical
--      device rather than a food app. We store the number and show it back. The
--      doctor reads it.

create table if not exists public.glucose_readings (
  id            bigint generated always as identity primary key,
  -- Fills itself from the logged-in session, exactly like meal_checks, so the
  -- browser only ever sends the number. RLS below still checks it matches.
  user_id       uuid not null default auth.uid() references auth.users (id) on delete cascade,
  -- Nullable on purpose (rule 1 above): a reading with no meal is normal.
  meal_check_id bigint references public.meal_checks (id) on delete set null,
  value_raw     numeric(6,2) not null,                            -- exactly what they typed
  unit          text not null check (unit in ('mmol', 'mgdl')),    -- what we read it as
  mgdl          numeric(6,1) not null,                            -- canonical, for comparisons
  taken_at      timestamptz not null default now()
);

-- The reading list for a month, newest first: the doctor report's query.
create index if not exists glucose_readings_user_time_idx
  on public.glucose_readings (user_id, taken_at desc);

-- Joining readings onto the meals they belong to.
create index if not exists glucose_readings_meal_idx
  on public.glucose_readings (meal_check_id);

-- Row Level Security: each person reads and writes only their own readings. Same
-- shape as push_subscriptions, which also needs delete. No service-role and no
-- server route: the browser client writes directly under the session, and the
-- policy is the whole of what keeps one person's health data private.
alter table public.glucose_readings enable row level security;

drop policy if exists "own readings select" on public.glucose_readings;
drop policy if exists "own readings insert" on public.glucose_readings;
drop policy if exists "own readings update" on public.glucose_readings;
drop policy if exists "own readings delete" on public.glucose_readings;

create policy "own readings select"
  on public.glucose_readings for select using (auth.uid() = user_id);
create policy "own readings insert"
  on public.glucose_readings for insert with check (auth.uid() = user_id);
create policy "own readings update"
  on public.glucose_readings for update using (auth.uid() = user_id);
create policy "own readings delete"
  on public.glucose_readings for delete using (auth.uid() = user_id);


-- ---------------------------------------------------------------------------
-- A BUG FIX that belongs in this migration, because readings need delete too.
--
-- meal-history-schema.sql created a select policy and an insert policy, and
-- stopped. But MonthReport has a bin on every row, and deleteCheck() in
-- lib/history.ts has been calling delete since it shipped. With no delete
-- policy, RLS refuses it silently: zero rows affected, no error thrown, and the
-- component had already removed the row from its own state. So the bin LOOKED
-- like it worked and the meal came back the next time the card was opened.
-- ---------------------------------------------------------------------------

drop policy if exists "own checks delete" on public.meal_checks;

create policy "own checks delete"
  on public.meal_checks for delete using (auth.uid() = user_id);


-- ---------------------------------------------------------------------------
-- Consent, recorded on the account.
--
-- A blood sugar reading is sensitive personal data under the NDPA 2023, which
-- wants consent that is explicit and given at the point of collection, not
-- buried in a terms page nobody opens. So the app asks once, on the very first
-- reading, and stamps the moment here.
--
-- Nothing is added to handle_new_user: this is not signup metadata, it is
-- something the person does later, inside the app. Null means "has not been
-- asked yet", which is the state every existing account is in.
-- ---------------------------------------------------------------------------

alter table public.profiles
  add column if not exists health_data_consent_at timestamptz;
