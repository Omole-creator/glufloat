-- #38  A rep's link for patients (2026-10-27).
--
-- Founder: doctor acquisition reps (and advisors) also get a link to bring
-- patients straight to GluFloat, without a doctor: glufloat.com/p/<ref_code>
-- (the same ref_code as their doctor link /d/<ref_code>, so every existing rep
-- has one at once). On each payment by such a patient in their first 12
-- months, the rep gets a THIRD of it (N1,500 of Premium's N4,500; GluFloat
-- keeps N3,000). No advisor share. Paid weekly like every other care fee, as a
-- clinician_earnings row of kind 'agent' with no source_hospital_id.
--
-- One row per patient, first touch wins (the primary key). Tied when the
-- patient first opens /app, only for an account under 30 days old that has
-- never paid. If the patient is also with a GluFloat doctor, this link wins
-- (the rep found them first) and the doctor-path rep shares are not paid.
--
-- Server only (RLS on, no policies). Idempotent.

create table if not exists public.rep_patients (
  user_id      uuid primary key references auth.users (id) on delete cascade,
  agent_id     uuid not null references public.field_agents (id) on delete cascade,
  attached_at  timestamptz not null default now()
);
create index if not exists rep_patients_agent_idx on public.rep_patients (agent_id);

alter table public.rep_patients enable row level security;

grant select, insert, update, delete on public.rep_patients to service_role;
