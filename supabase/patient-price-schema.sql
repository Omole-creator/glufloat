-- #44  A price for one patient (2026-11-28).
--
-- Founder's decision: a dietitian may charge one patient differently from
-- her usual price, set when she adds them or later on their page, and change
-- it at any time. It applies from that patient's next payment.
--  - hospital_patients.price: naira a month. Null = her usual price
--    (hospitals.patient_price).
--
-- Must run AFTER #32 (patient-pays). Idempotent: safe to run twice.
-- A column only, no new table, so no new GRANT lines are needed.

alter table public.hospital_patients add column if not exists price int;
alter table public.hospital_patients drop constraint if exists hospital_patients_price_check;
alter table public.hospital_patients add constraint hospital_patients_price_check
  check (price is null or (price >= 4500 and price <= 1000000));
