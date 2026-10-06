-- Expenses, other money in, and founder loans (/admin/finance). Run once in the
-- Supabase SQL editor. Idempotent: safe to re-paste.
--
--   finance_expenses   every naira spent, what it was spent on, and WHO paid.
--                      paid_by = 'company' came out of GluFloat's own account;
--                      'omole' or 'favour' came out of a founder's pocket, which
--                      makes it a loan the company owes that founder.
--   finance_income     money in that is NOT a Paystack subscription: other sales
--                      (counts as revenue), a grant, or an investment (both count
--                      as cash, never as revenue).
--   founder_loan_moves cash a founder put into the company, and money the company
--                      paid a founder back. Spending a founder did for the company
--                      is NOT repeated here; it lives in finance_expenses.
--
-- Subscription revenue is NOT typed in anywhere: it is read from `payments`.
-- Partner commissions are read from `commissions`. Both are counted on their own,
-- so they must never be entered here as well.
--
-- All amounts are KOBO, like `payments.amount`. RLS is on with NO policies: only
-- the admin routes (admin cookie, then the service role) read or write these.

create table if not exists public.finance_expenses (
  id          uuid primary key default gen_random_uuid(),
  spent_on    date not null,
  amount      bigint not null check (amount > 0),
  category    text not null,
  description text not null,
  vendor      text,
  paid_by     text not null default 'company' check (paid_by in ('company', 'omole', 'favour')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists finance_expenses_spent_idx on public.finance_expenses (spent_on desc);

create table if not exists public.finance_income (
  id          uuid primary key default gen_random_uuid(),
  received_on date not null,
  amount      bigint not null check (amount > 0),
  kind        text not null check (kind in ('other_revenue', 'grant', 'investment')),
  source      text not null,
  note        text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists finance_income_received_idx on public.finance_income (received_on desc);

create table if not exists public.founder_loan_moves (
  id          uuid primary key default gen_random_uuid(),
  founder     text not null check (founder in ('omole', 'favour')),
  kind        text not null check (kind in ('cash_in', 'repaid')),
  happened_on date not null,
  amount      bigint not null check (amount > 0),
  note        text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists founder_loan_moves_idx on public.founder_loan_moves (founder, happened_on desc);

alter table public.finance_expenses   enable row level security;
alter table public.finance_income     enable row level security;
alter table public.founder_loan_moves enable row level security;
