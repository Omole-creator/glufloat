-- Glufloat partner (referral) programme. Run once in the Supabase SQL editor,
-- after schema.sql, blog-schema.sql and blog-analytics.sql.
--
-- A health professional (dietitian, nurse, pharmacist, doctor) gets a link like
--   https://www.glufloat.com/r/ada4
-- Anyone who signs up after clicking it is theirs. When that person pays, the
-- partner earns 40% of the payment, on every renewal, for up to 12 payments.
--
-- Referred users are ORDINARY accounts in `profiles`. They keep counting in the
-- total users number on the main dashboard, exactly as before. The only new
-- thing on a profile is which partner (if any) introduced them.

-- 1. The partners ------------------------------------------------------------
create table if not exists public.partners (
  id         uuid primary key default gen_random_uuid(),
  -- `seq` is the order they were added: the 4th partner ever created is 4. It
  -- is what makes the link unique, so two people called Ada get /r/ada2 and
  -- /r/ada7 rather than colliding.
  seq        integer generated always as identity,
  code       text unique not null,          -- "ada4", the bit after /r/
  name       text not null,
  profession text not null,                 -- dietitian | nurse | pharmacist | doctor | other
  email      text not null,
  phone      text,
  active     boolean not null default true, -- switch a link off without deleting history
  created_at timestamptz not null default now()
);

create index if not exists partners_code_idx on public.partners (code);

-- 2. Link clicks -------------------------------------------------------------
-- One row per click of a partner link. Small: even 100 partners at 50 clicks a
-- day is about 2MB a year.
create table if not exists public.referral_clicks (
  id         bigint generated always as identity primary key,
  partner_id uuid not null references public.partners (id) on delete cascade,
  created_at timestamptz not null default now()
);

create index if not exists referral_clicks_partner_idx
  on public.referral_clicks (partner_id, created_at desc);

-- 3. Which partner introduced which user -------------------------------------
-- FIRST touch. Set once at sign-up and never changed, so a partner cannot have
-- a referral taken from them by whoever the person happened to click last.
alter table public.profiles
  add column if not exists partner_id uuid references public.partners (id) on delete set null;

create index if not exists profiles_partner_idx on public.profiles (partner_id);

-- 4. What each partner has earned --------------------------------------------
-- One row per successful payment made by a referred user. `payment_reference` is
-- unique, which is what makes the whole thing safe to re-run: Paystack can send
-- the same webhook twice, and both the webhook and the /unlock claim can write
-- the same payment, but a partner can only ever be paid once for it.
create table if not exists public.commissions (
  id                uuid primary key default gen_random_uuid(),
  partner_id        uuid not null references public.partners (id) on delete cascade,
  user_id           uuid references auth.users (id) on delete set null,
  payment_reference text unique not null,
  amount            integer not null,          -- kobo. 40% of the payment.
  status            text not null default 'pending',  -- pending | paid
  earned_at         timestamptz not null default now(),
  paid_at           timestamptz,
  payout_id         uuid,
  constraint commissions_status_check check (status in ('pending', 'paid'))
);

create index if not exists commissions_partner_idx on public.commissions (partner_id, status);
create index if not exists commissions_earned_idx on public.commissions (earned_at desc);

-- 5. Payouts -----------------------------------------------------------------
-- One row each time you actually pay a partner. Ticking "paid" writes one of
-- these and stamps every pending commission it covers, so the money is traceable.
create table if not exists public.payouts (
  id         uuid primary key default gen_random_uuid(),
  partner_id uuid not null references public.partners (id) on delete cascade,
  amount     integer not null,                 -- kobo
  count      integer not null,                 -- how many commissions it covered
  paid_at    timestamptz not null default now(),
  note       text
);

create index if not exists payouts_partner_idx on public.payouts (partner_id, paid_at desc);

-- 6. Earn a commission automatically when a referred user pays ----------------
--
-- This is a TRIGGER ON `payments`, not code in a route, and that is deliberate.
-- Two different routes write a payment: /api/paystack/webhook and the /unlock
-- claim. If the commission logic lived in a route, one of them would eventually
-- be forgotten. Here, any successful payment earns a commission no matter how it
-- arrived, and it cannot be double-paid.
--
-- The rules:
--   * only when the payer was introduced by a partner
--   * 40% of what they actually paid (not a hardcoded N600, so a price change
--     just works)
--   * a maximum of 12 payments per referred user. After that the customer is
--     fully yours. Change COMMISSION_CAP below and re-run to alter it.
create or replace function public.earn_commission()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_partner uuid;
  v_paid_so_far integer;
  COMMISSION_RATE constant numeric := 0.40;  -- 40%
  COMMISSION_CAP  constant integer := 12;    -- payments per referred user
begin
  if new.status is distinct from 'success' or new.user_id is null then
    return new;
  end if;

  select partner_id into v_partner from public.profiles where id = new.user_id;
  if v_partner is null then
    return new;
  end if;

  select count(*) into v_paid_so_far
    from public.commissions
   where partner_id = v_partner and user_id = new.user_id;

  if v_paid_so_far >= COMMISSION_CAP then
    return new;   -- this customer has earned all they are going to
  end if;

  insert into public.commissions (partner_id, user_id, payment_reference, amount)
  values (
    v_partner,
    new.user_id,
    new.reference,
    round(coalesce(new.amount, 0) * COMMISSION_RATE)::integer
  )
  on conflict (payment_reference) do nothing;   -- same payment twice earns once

  return new;
end;
$$;

drop trigger if exists payments_earn_commission on public.payments;
create trigger payments_earn_commission
  after insert or update on public.payments
  for each row execute function public.earn_commission();

-- 7. Carry the partner through sign-up ---------------------------------------
-- The sign-up form puts the partner's code into the new user's metadata. This
-- trigger resolves it to a partner and stamps the profile.
--
-- It REPLACES the function from blog-analytics.sql. Keep all four things it
-- copies (name, email, source_post, partner_id) if you ever touch it again --
-- dropping one silently breaks that feature with no error anywhere.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_partner uuid;
begin
  select id into v_partner
    from public.partners
   where code = nullif(new.raw_user_meta_data->>'partner_code', '')
     and active;

  insert into public.profiles (id, name, email, source_post, partner_id)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', ''),
    new.email,
    nullif(new.raw_user_meta_data->>'source_post', ''),
    v_partner
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 8. Row Level Security ------------------------------------------------------
-- None of these tables is ever touched from a browser. RLS on, no policy, so the
-- anon key can neither read nor write them. Everything goes through the admin
-- screen and the tracking route, both using the service-role key.
alter table public.partners        enable row level security;
alter table public.referral_clicks enable row level security;
alter table public.commissions     enable row level security;
alter table public.payouts         enable row level security;
