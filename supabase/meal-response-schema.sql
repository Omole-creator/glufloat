-- Meal tests: a meal plus a sugar test before it and a sugar test 2 hours after.
-- Run once in the Supabase SQL editor, AFTER data-collection-schema.sql (#16).
-- Idempotent: safe to paste again.
--
-- The idea comes from GluFloat's co-founder dietitian (2026-10-07): the unit a
-- doctor reads is ONE meal with its own sugar before and after, not loose numbers.
--
-- Nothing new is needed to STORE the two sugar tests: they are ordinary rows in
-- glucose_readings, linked to the meal by meal_check_id, with context
-- 'before_meal' or 'after_meal' (both already allowed). What this adds is when
-- the meal STARTED, which the 2-hour clock runs from, and whether the 2-hour
-- reminder has already been sent, so the reminder job never sends it twice.
--
-- The app works before this runs: it remembers a started meal on the device, and
-- the 2-hour reminder route answers "run meal-response-schema.sql" until it does.

-- 1 -------------------------------------------------------------------------
-- When the person tapped "Start my meal". Null for every meal logged the old way
-- ("I already ate it"), which is how the app tells a meal test from a plain log.
alter table public.meal_checks add column if not exists started_at timestamptz;

-- 2 -------------------------------------------------------------------------
-- Set by /api/push/meal-test once the 2-hour reminder has gone out.
alter table public.meal_checks add column if not exists reminder_sent_at timestamptz;

-- The reminder job asks "which meal tests started about 2 hours ago and have not
-- been reminded?" every 10 minutes. This keeps that question cheap.
create index if not exists meal_checks_started_idx
  on public.meal_checks (started_at)
  where started_at is not null and reminder_sent_at is null;
