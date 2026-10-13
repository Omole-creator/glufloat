-- A dietitian's own rules for one patient, 2026-10-13. #26 in SETUP.md. Paste
-- once into the Supabase SQL editor, AFTER #25. Idempotent.
--
-- GluFloat for dietitians: on a patient's page the dietitian writes a short
-- note and picks foods to leave out and foods to eat more of. The patient's
-- Today tab shows "From <her name>: <note>", and the meals GluFloat picks for
-- them skip her left-out foods and lean toward her eat-more foods, still
-- green-only and still fitted to the patient's own My details.
--
-- Kept on hospital_patients (one row per patient per practice), so the rules
-- end with the place: a patient who leaves her stops following them. RLS on
-- that table has no policies; only the server reads or writes these.

alter table public.hospital_patients add column if not exists dietitian_note text;
alter table public.hospital_patients add column if not exists avoid_food_ids text[] not null default '{}';
alter table public.hospital_patients add column if not exists prefer_food_ids text[] not null default '{}';
alter table public.hospital_patients add column if not exists rules_updated_at timestamptz;
