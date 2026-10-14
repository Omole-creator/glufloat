-- Clinician sugar flags, 2026-10-14. #29 in SETUP.md. Paste once into the
-- Supabase SQL editor, AFTER #22. Idempotent.
--
-- before_target_mgdl: the patient's before-meal target, set by their doctor or
--   dietitian (null = 150, lib/safetyFlag.ts DEFAULT_BEFORE_TARGET).
-- safety_seen_at / safety_seen_by: "Mark as seen" on the red flag. Hides every
--   sugar test taken up to then, for the whole hospital; a newer one flags again.
alter table public.hospital_patients add column if not exists before_target_mgdl numeric(5,1);
alter table public.hospital_patients add column if not exists safety_seen_at timestamptz;
alter table public.hospital_patients add column if not exists safety_seen_by text;

do $$ begin
  alter table public.hospital_patients
    add constraint hospital_patients_before_target_range
    check (before_target_mgdl is null or before_target_mgdl between 80 and 250);
exception when duplicate_object then null; end $$;
