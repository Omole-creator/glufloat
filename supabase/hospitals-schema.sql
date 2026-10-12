-- GluFloat for hospitals (B2B), 2026-10-12. #22 in SETUP.md. Paste once into the
-- Supabase SQL editor. Idempotent: safe to re-paste.
--
--   hospitals          one row per hospital or clinic. Starts as a pilot request
--                      from /hospitals; GluFloat approves it in /admin/hospitals.
--   hospital_staff     the hospital's own people: its admin(s), doctors and
--                      dietitians. They see every patient of that hospital.
--   hospital_invites   one-time links that make someone a staff member.
--   hospital_patients  the hospital's patients. A row can exist before the
--                      patient has an account (status 'invited'), so the
--                      hospital can type in 200 names before anyone joins.
--   hospital_documents quotes and invoices GluFloat sends a hospital. A paid
--                      invoice is what moves a hospital's access forward.
--   app_settings       small key/value settings, e.g. the bank details printed
--                      on an invoice (typed in /admin, never in the code).
--
-- RLS is ON with NO policies on every table: only the server (service role,
-- after it has checked who is asking) reads or writes them. A patient's app asks
-- /api/hospital/me, never these tables directly.
--
-- Hospital money is deliberately NOT written to `payments`. The partner
-- commission trigger and the invite-a-friend reward both fire on `payments`, and
-- neither must ever pay out on a hospital invoice. A paid invoice is copied into
-- finance_income (other_revenue) so /admin/finance still counts it.

create table if not exists public.hospitals (
  id             uuid primary key default gen_random_uuid(),
  code           text not null unique,           -- the poster code, e.g. 4KQ7MD
  name           text not null,
  contact_name   text,
  contact_role   text,
  contact_phone  text,
  contact_email  text,
  city           text,
  state          text,
  est_patients   int,
  message        text,
  status         text not null default 'requested'
                 check (status in ('requested', 'pilot', 'active', 'ended', 'declined')),
  plan           text check (plan in ('pilot', 'care50', 'care100', 'care200', 'custom')),
  seats          int not null default 0 check (seats >= 0),
  access_until   timestamptz,
  billing        text check (billing in ('monthly', 'annual')),
  chat_user_id   uuid references auth.users (id) on delete set null,
  created_at     timestamptz not null default now(),
  approved_at    timestamptz,
  updated_at     timestamptz not null default now()
);

create table if not exists public.hospital_staff (
  hospital_id  uuid not null references public.hospitals (id) on delete cascade,
  user_id      uuid not null references auth.users (id) on delete cascade,
  role         text not null check (role in ('admin', 'doctor', 'dietitian')),
  name         text not null,
  phone        text,
  created_at   timestamptz not null default now(),
  primary key (hospital_id, user_id)
);
create index if not exists hospital_staff_user_idx on public.hospital_staff (user_id);

create table if not exists public.hospital_invites (
  token        text primary key,
  hospital_id  uuid not null references public.hospitals (id) on delete cascade,
  role         text not null check (role in ('admin', 'doctor', 'dietitian')),
  name         text,
  phone        text,
  email        text,
  created_at   timestamptz not null default now(),
  expires_at   timestamptz not null,
  used_at      timestamptz,
  used_by      uuid references auth.users (id) on delete set null
);
create index if not exists hospital_invites_hospital_idx on public.hospital_invites (hospital_id);

create table if not exists public.hospital_patients (
  id                   uuid primary key default gen_random_uuid(),
  hospital_id          uuid not null references public.hospitals (id) on delete cascade,
  user_id              uuid references auth.users (id) on delete set null,
  name                 text not null,
  phone                text not null,          -- normalised, 08132097317
  email                text,
  status               text not null default 'invited'
                       check (status in ('invited', 'active', 'waiting', 'removed')),
  invite_token         text unique,
  confirmed            boolean not null default false,  -- "these patients agreed to join"
  added_by             uuid references auth.users (id) on delete set null,
  created_at           timestamptz not null default now(),
  joined_at            timestamptz,
  removed_at           timestamptz,
  -- Paid personal days a patient brought with them, given back when they leave.
  carried_ms           bigint,
  carried_restored_at  timestamptz
);
create index if not exists hospital_patients_hospital_idx on public.hospital_patients (hospital_id, status);
create index if not exists hospital_patients_user_idx on public.hospital_patients (user_id);
-- One live row per person per hospital, by account and by phone.
create unique index if not exists hospital_patients_user_live
  on public.hospital_patients (hospital_id, user_id)
  where status <> 'removed' and user_id is not null;
create unique index if not exists hospital_patients_phone_live
  on public.hospital_patients (hospital_id, phone)
  where status <> 'removed';

create table if not exists public.hospital_documents (
  id           uuid primary key default gen_random_uuid(),
  number       text not null unique,            -- GF-Q-2026-0001 / GF-INV-2026-0001
  kind         text not null check (kind in ('quote', 'invoice')),
  hospital_id  uuid not null references public.hospitals (id) on delete cascade,
  plan         text not null check (plan in ('care50', 'care100', 'care200', 'custom')),
  seats        int not null check (seats > 0),
  billing      text not null check (billing in ('monthly', 'annual')),
  months       int not null check (months > 0),  -- months of access this buys
  amount       bigint not null check (amount > 0), -- kobo, the total to pay
  vat_rate     numeric not null default 0,        -- 0 while GluFloat is under the threshold
  notes        text,
  issued_on    date not null default current_date,
  due_on       date,
  status       text not null default 'open' check (status in ('open', 'paid', 'void')),
  paid_on      date,
  created_at   timestamptz not null default now()
);
create index if not exists hospital_documents_hospital_idx on public.hospital_documents (hospital_id, created_at desc);

create table if not exists public.app_settings (
  key         text primary key,
  value       jsonb not null,
  updated_at  timestamptz not null default now()
);

alter table public.hospitals          enable row level security;
alter table public.hospital_staff     enable row level security;
alter table public.hospital_invites   enable row level security;
alter table public.hospital_patients  enable row level security;
alter table public.hospital_documents enable row level security;
alter table public.app_settings       enable row level security;
