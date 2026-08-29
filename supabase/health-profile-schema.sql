-- TDEE/BMR inputs, health conditions, and diabetes-medication timing. Run
-- once in the Supabase SQL editor, after personalization-schema.sql (see
-- supabase/SETUP.md for the full order).
--
-- IMPORTANT SAFETY NOTE, same as personalization-schema.sql: none of these
-- fields ever change a food's own gi/baseVerdict/portionGuidance/frequency,
-- and they never touch the verdict engine's score. sex/age/weight/height feed
-- lib/tdee.ts's calorie target, which only ever sets a daily calorie budget
-- and biases which already-GREEN plate is offered (lib/nextMeal.ts). conditions
-- bias the same way (lib/personalization.ts). Medication timing only tags
-- which meal card shows a "take your tablet" note — it changes no food data.

alter table public.profiles
  add column if not exists sex text,
  add column if not exists age_years integer,
  add column if not exists weight_kg numeric,
  add column if not exists height_cm numeric,
  add column if not exists conditions text[] not null default '{}',
  add column if not exists med_doses_per_day smallint,
  add column if not exists med_times text[] not null default '{}',
  add column if not exists med_relation_to_food text;

alter table public.profiles
  drop constraint if exists profiles_sex_check,
  add constraint profiles_sex_check
    check (sex is null or sex in ('male','female'));

alter table public.profiles
  drop constraint if exists profiles_age_years_check,
  add constraint profiles_age_years_check
    check (age_years is null or age_years between 1 and 120);

-- Generous but real bounds (the same spirit as age_years above) — these feed
-- lib/tdee.ts's BMR formula directly, and an unconstrained 0 or negative
-- value there produces a nonsense (negative) resting-energy number on
-- screen. The final calorie target is floored at 1200kcal regardless
-- (lib/tdee.ts's calorieTarget), so this cannot make the app unsafe, only
-- confusing — these constraints close that off at the source.
alter table public.profiles
  drop constraint if exists profiles_weight_kg_check,
  add constraint profiles_weight_kg_check
    check (weight_kg is null or weight_kg between 20 and 300);

alter table public.profiles
  drop constraint if exists profiles_height_cm_check,
  add constraint profiles_height_cm_check
    check (height_cm is null or height_cm between 50 and 250);

alter table public.profiles
  drop constraint if exists profiles_conditions_check,
  add constraint profiles_conditions_check
    check (conditions <@ array['hypertension','high_cholesterol','kidney_disease']);

alter table public.profiles
  drop constraint if exists profiles_med_doses_per_day_check,
  add constraint profiles_med_doses_per_day_check
    check (med_doses_per_day is null or med_doses_per_day between 0 and 3);

alter table public.profiles
  drop constraint if exists profiles_med_times_check,
  add constraint profiles_med_times_check
    check (med_times <@ array['morning','afternoon','evening']);

alter table public.profiles
  drop constraint if exists profiles_med_relation_to_food_check,
  add constraint profiles_med_relation_to_food_check
    check (med_relation_to_food is null or med_relation_to_food in ('before','after'));
