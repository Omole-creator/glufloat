-- Pause freezes a patient's countdown, 2026-10-13. #28 in SETUP.md. Paste once
-- into the Supabase SQL editor, AFTER #27. Idempotent.
--
-- Founder's rule: pausing and unpausing must never make free days. On pause the
-- time left is saved here; unpause gives back exactly that; recording a
-- payment adds exactly the months paid on top of it.
alter table public.hospital_patients add column if not exists paused_left_ms bigint;
