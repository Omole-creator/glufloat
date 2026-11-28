-- #43  A dietitian chooses her patients' free days (2026-11-28).
--
-- Founder's decision, after a dietitian asked why clients who already pay her
-- should get two free weeks: she chooses, none or 7 days.
--  - hospitals.patient_free_days: her setting, used for anyone who joins by
--    her QR code and as the default for a personal invite. Null = 7.
--  - hospital_patients.free_days: one invite's own choice. Null = her setting.
-- The fixed 14 days are gone. Patients who already joined keep their days.
--
-- Must run AFTER #32 (patient-pays). Idempotent: safe to run twice.
-- Columns only, no new table, so no new GRANT lines are needed.

alter table public.hospitals add column if not exists patient_free_days int;
alter table public.hospitals drop constraint if exists hospitals_patient_free_days_check;
alter table public.hospitals add constraint hospitals_patient_free_days_check
  check (patient_free_days is null or patient_free_days in (0, 7));

alter table public.hospital_patients add column if not exists free_days int;
alter table public.hospital_patients drop constraint if exists hospital_patients_free_days_check;
alter table public.hospital_patients add constraint hospital_patients_free_days_check
  check (free_days is null or free_days in (0, 7));
