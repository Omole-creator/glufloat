-- GluFloat for hospitals, part 2 (2026-10-12). #23 in SETUP.md. Must run AFTER
-- hospitals-schema.sql (#22). Idempotent: safe to re-paste.
--
-- A patient can now chat with BOTH a dietitian and a doctor when the hospital
-- has both (founder). The hospital admin picks one of each. With nobody
-- picked, the app uses the hospital's first dietitian and first doctor.
--
-- `chat_user_id` (from #22) is left in place and no longer read.

alter table public.hospitals
  add column if not exists chat_dietitian_id uuid references auth.users (id) on delete set null,
  add column if not exists chat_doctor_id    uuid references auth.users (id) on delete set null;
