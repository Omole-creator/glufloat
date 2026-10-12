-- #24: "Which swallows do you eat?" (co-founder dietitian + founder, 2026-10-12).
-- The traditional swallows a person ticked in My details (food ids, e.g.
-- 'tuwo-shinkafa', 'acha'). Empty or null = every swallow takes its turn on
-- the blue card. Own-row RLS on profiles already covers it. Idempotent.
alter table public.profiles
  add column if not exists swallows text[] not null default '{}';
