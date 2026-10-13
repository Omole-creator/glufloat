-- Patients' payment countdown and pause, 2026-10-13. #27 in SETUP.md. Paste
-- once into the Supabase SQL editor, AFTER #26. Idempotent.
--
-- Patients pay their dietitian or hospital OUTSIDE GluFloat, so GluFloat
-- cannot see it. Founder's design:
--   paid_until  starts by itself at 30 days when a patient joins; the
--               dietitian or hospital admin taps "Paid" (1, 3, 6 or 12
--               months) when the patient pays again. The patient sees the
--               days left; overdue patients show in red on the list. Nothing
--               is removed automatically.
--   'paused'    a patient who could not renew yet. They stay on the list
--               (note, food rules and history kept) but are not covered and
--               do not use a place. Recording a payment resumes them.

alter table public.hospital_patients add column if not exists paid_until timestamptz;

alter table public.hospital_patients drop constraint if exists hospital_patients_status_check;
alter table public.hospital_patients add constraint hospital_patients_status_check
  check (status in ('invited', 'active', 'waiting', 'removed', 'paused'));

-- Patients already in: their countdown starts from the day they joined.
update public.hospital_patients
  set paid_until = joined_at + interval '30 days'
  where paid_until is null and joined_at is not null and status = 'active';
