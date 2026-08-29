-- Goal / activity / meal-pattern personalization, and the paid tier on a
-- subscription. Run once in the Supabase SQL editor, after phone-schema.sql
-- (see supabase/SETUP.md for the full order).
--
-- IMPORTANT SAFETY NOTE, read before touching this file: none of these fields
-- ever change a food's own gi/baseVerdict/portionGuidance/frequency. They only
-- ever REORDER which already-GREEN plate is shown first (goals, activity) or
-- WHICH of breakfast/lunch/dinner is shown at all (meal_pattern). See
-- lib/personalization.ts and lib/mealPattern.ts.

-- 1. Personalization fields on the profile -----------------------------------
alter table public.profiles
  add column if not exists goals text[] not null default '{}',
  add column if not exists activity_level text,
  add column if not exists meal_pattern text[] not null default array['breakfast','lunch','dinner'];

alter table public.profiles
  drop constraint if exists profiles_goals_check,
  add constraint profiles_goals_check
    check (goals <@ array['maintain','lose_weight','gain_weight','build_muscle']);

-- 'active' is kept for backward compatibility with rows written before
-- health-profile-schema.sql expanded this to the full 5-tier TDEE scale
-- (sedentary/light/moderate/very_active/extra_active, see lib/tdee.ts). The
-- UI never writes 'active' again; lib/personalizationProfile.ts normalises
-- an existing 'active' row to 'very_active' on read. Existing data must
-- never be invalidated by widening this column's options.
alter table public.profiles
  drop constraint if exists profiles_activity_level_check,
  add constraint profiles_activity_level_check
    check (activity_level is null or activity_level in
      ('sedentary','light','moderate','very_active','extra_active','active'));

alter table public.profiles
  drop constraint if exists profiles_meal_pattern_check,
  add constraint profiles_meal_pattern_check
    check (meal_pattern <@ array['breakfast','lunch','dinner']);

-- 2. The paid tier -------------------------------------------------------------
-- basic (N1,500) | plus (N2,500, goal/activity/meal-pattern personalization) |
-- dietitian (N4,500, plus WhatsApp access to an in-house dietitian).
-- The exact kobo amount each tier is charged lives in lib/pricing.ts, which the
-- webhook and the claim route both read from — this column is set FROM that
-- mapping, never guessed independently in more than one place.
alter table public.subscriptions
  add column if not exists tier text not null default 'basic';

alter table public.subscriptions
  drop constraint if exists subscriptions_tier_check,
  add constraint subscriptions_tier_check
    check (tier in ('basic','plus','dietitian'));
