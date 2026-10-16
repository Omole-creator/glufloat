-- GluFloat for doctors, field agents and care fees (2026-10-16). #31 in
-- SETUP.md. Paste once into the Supabase SQL editor, AFTER
-- dietitian-practice-schema.sql (#25) and chat-schema.sql (#30).
-- Idempotent: safe to re-paste.
--
-- Founder's decisions (advisor's model, 2026-10-16):
--
--   * A doctor's practice is a row in `hospitals` with kind = 'doctor'. It
--     reuses the patient list, QR code, records, sugar flags, notes and chat.
--     Unlike a hospital or a dietitian, the doctor pays nothing and the
--     PATIENT pays GluFloat Premium themselves after the 7-day trial.
--   * Each payment by a doctor's patient earns:
--       doctor  22.23% (30% when no field agent brought the doctor),
--       agent   11.12% for the patient's first 12 months,
--       advisor 10%    for the patient's first 12 months (the agent's manager).
--     A doctor who invites a colleague gets N3,000 once, when the colleague's
--     first patient pays. Agents earn nothing from a colleague's referral.
--   * Field agents and advisors never sign up. GluFloat adds them in
--     /admin/agents, which gives each a link for doctors and a private
--     dashboard link.
--   * Paid weekly, no minimum. /admin/payouts lists who is owed what this
--     week, with their bank details; "Mark as paid" records the money sent.
--
-- The money is written by the server (lib/careFeesServer.ts, called from
-- lib/paymentGrant.ts, which runs exactly once per payment). The unique key on
-- clinician_earnings (reference, kind) means a payment can never pay twice.

-- ---------------------------------------------------------------- doctors
alter table public.hospitals drop constraint if exists hospitals_kind_check;
alter table public.hospitals add constraint hospitals_kind_check check (kind in ('hospital', 'dietitian', 'doctor'));

alter table public.hospitals drop constraint if exists hospitals_plan_check;
alter table public.hospitals add constraint hospitals_plan_check
  check (plan in ('pilot', 'care50', 'care100', 'care200', 'custom', 'diet5', 'diet10', 'diet20', 'doctor'));

-- ---------------------------------------------------------------- agents
create table if not exists public.field_agents (
  id              uuid primary key default gen_random_uuid(),
  role            text not null default 'agent' check (role in ('agent', 'advisor')),
  name            text not null,
  phone           text,
  email           text,
  -- In the link a doctor opens: glufloat.com/d/<ref_code>. Never shown to the doctor.
  ref_code        text not null unique,
  -- The agent's private dashboard: glufloat.com/agent/<dash_token>. Secret.
  dash_token      text not null unique,
  -- An agent's advisor (an advisor row). Null for an advisor, or an agent with none.
  manager_id      uuid references public.field_agents (id) on delete set null,
  bank_name       text,
  bank_code       text,
  account_number  text,
  account_name    text,
  -- Kept for automatic Paystack transfers later. Unused for now.
  recipient_code  text,
  status          text not null default 'active' check (status in ('active', 'off')),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index if not exists field_agents_manager_idx on public.field_agents (manager_id);

alter table public.hospitals add column if not exists mdcn_number text;
-- The field agent who brought this doctor (first touch, never edited by the doctor).
alter table public.hospitals add column if not exists agent_id uuid references public.field_agents (id) on delete set null;
-- The doctor who invited this doctor (a colleague). No agent then.
alter table public.hospitals add column if not exists invited_by uuid references public.hospitals (id) on delete set null;
-- The doctor's own bank account for care fees.
alter table public.hospitals add column if not exists bank_name text;
alter table public.hospitals add column if not exists bank_code text;
alter table public.hospitals add column if not exists account_number text;
alter table public.hospitals add column if not exists account_name text;
alter table public.hospitals add column if not exists recipient_code text;
create index if not exists hospitals_agent_idx on public.hospitals (agent_id);

-- ---------------------------------------------------------------- payouts
create table if not exists public.earning_payouts (
  id             uuid primary key default gen_random_uuid(),
  hospital_id    uuid references public.hospitals (id) on delete set null,
  agent_id       uuid references public.field_agents (id) on delete set null,
  amount         bigint not null check (amount > 0),   -- kobo
  -- paid: the money was sent. sending/failed are kept for automatic transfers
  -- later; a failed payout's earnings are owed again.
  status         text not null default 'paid' check (status in ('sending', 'paid', 'failed')),
  reference      text not null unique,
  transfer_code  text,
  note           text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  check ((hospital_id is null) <> (agent_id is null))
);
create index if not exists earning_payouts_hospital_idx on public.earning_payouts (hospital_id, created_at desc);
create index if not exists earning_payouts_agent_idx on public.earning_payouts (agent_id, created_at desc);

-- ---------------------------------------------------------------- earnings
create table if not exists public.clinician_earnings (
  id                  uuid primary key default gen_random_uuid(),
  -- The Paystack payment reference, or 'colleague:<doctor practice id>' for the bonus.
  reference           text not null,
  kind                text not null check (kind in ('care', 'agent', 'advisor', 'colleague')),
  -- Who is paid: a doctor's practice (care, colleague) or a field agent (agent, advisor).
  hospital_id         uuid references public.hospitals (id) on delete set null,
  agent_id            uuid references public.field_agents (id) on delete set null,
  -- Where it came from: the doctor whose patient paid, and the patient.
  source_hospital_id  uuid references public.hospitals (id) on delete set null,
  patient_user_id     uuid references auth.users (id) on delete set null,
  payment_amount      bigint,          -- kobo
  rate                numeric,
  amount              bigint not null check (amount > 0),   -- kobo
  earned_at           timestamptz not null default now(),
  payout_id           uuid references public.earning_payouts (id) on delete set null,
  unique (reference, kind)
);
create index if not exists clinician_earnings_hospital_idx on public.clinician_earnings (hospital_id, earned_at desc);
create index if not exists clinician_earnings_agent_idx on public.clinician_earnings (agent_id, earned_at desc);
create index if not exists clinician_earnings_source_idx on public.clinician_earnings (source_hospital_id, patient_user_id);
create index if not exists clinician_earnings_unpaid_idx on public.clinician_earnings (payout_id) where payout_id is null;

-- Server only, like every hospital table.
alter table public.field_agents enable row level security;
alter table public.earning_payouts enable row level security;
alter table public.clinician_earnings enable row level security;
