-- #34 GluFloat doctors: "Mark as reviewed" (founder, 2026-10-20).
-- Remembers when a doctor last marked a patient as reviewed, paid or not.
-- The N1,000 fee itself needs nothing new: it is a clinician_earnings row
-- (kind 'care', reference 'review:<practice>:<patient>:<YYYY-MM>'), and the
-- table's unique (reference, kind) makes it once per patient per month.
-- Safe to run twice.
alter table public.hospital_patients add column if not exists reviewed_at timestamptz;
alter table public.hospital_patients add column if not exists reviewed_by text;
