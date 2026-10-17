-- #32  Patients pay their dietitian through GluFloat (2026-10-17).
--
-- Founder's decisions, asked one at a time:
--  - A dietitian pays GluFloat nothing. She sets her own monthly price per
--    patient (at least N4,500; N4,500 until she changes it). Her patient pays
--    that price inside the app, through Paystack.
--  - GluFloat keeps N2,000 of every payment (Paystack's fee comes out of
--    that); the rest is hers, paid to her bank weekly from /admin/payouts.
--  - Each patient gets 14 free days from the day they join, then pays one
--    month at a time. When their time runs out they see only her price.
--  - The old 5/10/20-patient plans are gone. "Record payment" is gone for
--    dietitians (hospitals keep theirs).
--
-- Must run AFTER #25 (dietitian-practice), #27/#28 (paid_until, pause) and
-- #31 (doctors: clinician_earnings). Idempotent: safe to run twice.

-- Her price, in naira. Null = the default (N4,500).
alter table public.hospitals add column if not exists patient_price int;
alter table public.hospitals drop constraint if exists hospitals_patient_price_check;
alter table public.hospitals add constraint hospitals_patient_price_check
  check (patient_price is null or (patient_price >= 4500 and patient_price <= 1000000));

-- The new plan name for a dietitian's practice.
alter table public.hospitals drop constraint if exists hospitals_plan_check;
alter table public.hospitals add constraint hospitals_plan_check
  check (plan in ('pilot', 'care50', 'care100', 'care200', 'custom', 'diet5', 'diet10', 'diet20', 'doctor', 'patient_pays'));

-- Her share of each payment is a care fee row, kind 'dietitian', so the
-- existing Earnings page, /admin/payouts and Finance (as a cost) all see it.
alter table public.clinician_earnings drop constraint if exists clinician_earnings_kind_check;
alter table public.clinician_earnings add constraint clinician_earnings_kind_check
  check (kind in ('care', 'agent', 'advisor', 'colleague', 'dietitian'));

-- One row per patient payment. The primary key is the lock: exactly one of
-- /api/paystack/claim and /api/paystack/webhook grants the month.
-- Deliberately NOT the `payments` table: that fires the partner commission
-- trigger and the invite-a-friend reward, and is read as a GluFloat plan.
create table if not exists public.patient_payments (
  reference       text primary key,
  hospital_id     uuid references public.hospitals (id) on delete set null,
  patient_row_id  uuid references public.hospital_patients (id) on delete set null,
  user_id         uuid references auth.users (id) on delete set null,
  amount          bigint not null check (amount > 0),        -- kobo, what the patient paid
  dietitian_share bigint not null default 0,                 -- kobo
  paid_until      timestamptz,                               -- the patient's new end date
  paid_at         timestamptz not null default now(),
  created_at      timestamptz not null default now()
);
create index if not exists patient_payments_hospital_idx on public.patient_payments (hospital_id, paid_at desc);
create index if not exists patient_payments_user_idx on public.patient_payments (user_id, paid_at desc);
-- RLS on with NO policies: only the server (service role) reads or writes it.
alter table public.patient_payments enable row level security;

-- Every dietitian's practice moves to the new model. A practice no longer
-- runs out (her patients' own dates decide who is covered), and has no limit
-- on patients. Switched-off practices stay switched off.
update public.hospitals
   set plan = 'patient_pays',
       status = 'active',
       seats = 1000000,
       billing = null,
       access_until = '2999-12-31T00:00:00Z',
       updated_at = now()
 where kind = 'dietitian'
   and status <> 'declined';

-- Any patient already with a dietitian and no end date gets 14 free days from now.
update public.hospital_patients hp
   set paid_until = now() + interval '14 days'
  from public.hospitals h
 where hp.hospital_id = h.id
   and h.kind = 'dietitian'
   and hp.status = 'active'
   and hp.paid_until is null;
