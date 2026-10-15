-- In-app chat and clinicians' notes, 2026-10-15. #30 in SETUP.md. Paste once
-- into the Supabase SQL editor, AFTER #22 (hospitals) and dietitian-schema.sql
-- (#12). Idempotent: safe to paste again.
--
-- Replaces WhatsApp for patient <-> clinician chat (founder, 2026-10-15):
--  * A hospital or dietitian-practice patient has ONE chat with the care team
--    (hospital_id set). Every doctor and dietitian there reads and answers it,
--    and each message carries who wrote it.
--  * A Premium patient chats with their in-house dietitian (dietitian_id set),
--    the one assign_dietitian() gave them. She answers from /inbox, so her row
--    in inhouse_dietitians now carries the login she uses (user_id).
--  * Text only. No message words ever reach /admin; it sees counts only.
--
-- patient_notes: a hospital doctor's or dietitian's note for one patient, one
-- per clinician, shown on top of the patient's blue card. A dietitian's
-- practice keeps using hospital_patients.dietitian_note (#26).
--
-- RLS on with NO policies: every read and write goes through the server
-- routes, which check who is asking first (same as every hospital table).

-- 1. The login an in-house (Premium) dietitian answers chats with ------------
alter table public.inhouse_dietitians
  add column if not exists user_id uuid references auth.users (id) on delete set null;

-- 2. One chat per patient per care team ---------------------------------------
create table if not exists public.chat_threads (
  id                uuid primary key default gen_random_uuid(),
  patient_id        uuid not null references auth.users (id) on delete cascade,
  hospital_id       uuid references public.hospitals (id) on delete cascade,
  dietitian_id      uuid references public.inhouse_dietitians (id) on delete cascade,
  created_at        timestamptz not null default now(),
  last_message_at   timestamptz,
  last_patient_at   timestamptz,  -- newest message from the patient
  last_staff_at     timestamptz,  -- newest message from the care team
  patient_read_at   timestamptz,  -- the patient last opened the chat
  staff_cleared_at  timestamptz,  -- "No reply needed" pressed by the care team
  constraint chat_threads_one_team check ((hospital_id is null) <> (dietitian_id is null))
);

create unique index if not exists chat_threads_patient_hospital
  on public.chat_threads (patient_id, hospital_id) where hospital_id is not null;
create unique index if not exists chat_threads_patient_dietitian
  on public.chat_threads (patient_id, dietitian_id) where dietitian_id is not null;
create index if not exists chat_threads_hospital_idx on public.chat_threads (hospital_id);
create index if not exists chat_threads_dietitian_idx on public.chat_threads (dietitian_id);

create table if not exists public.chat_messages (
  id           bigint generated always as identity primary key,
  thread_id    uuid not null references public.chat_threads (id) on delete cascade,
  sender_id    uuid references auth.users (id) on delete set null,
  sender_role  text not null check (sender_role in ('patient', 'doctor', 'dietitian', 'admin')),
  sender_name  text not null,
  body         text not null check (char_length(body) between 1 and 2000),
  created_at   timestamptz not null default now()
);

create index if not exists chat_messages_thread_idx on public.chat_messages (thread_id, id);

-- 3. Clinicians' notes (hospital doctors and dietitians) ----------------------
create table if not exists public.patient_notes (
  patient_row_id  uuid not null references public.hospital_patients (id) on delete cascade,
  author_id       uuid not null references auth.users (id) on delete cascade,
  author_name     text not null,
  author_role     text not null check (author_role in ('doctor', 'dietitian')),
  note            text not null check (char_length(note) between 1 and 300),
  updated_at      timestamptz not null default now(),
  primary key (patient_row_id, author_id)
);

alter table public.chat_threads  enable row level security;
alter table public.chat_messages enable row level security;
alter table public.patient_notes enable row level security;
