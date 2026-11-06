-- #40: nut allergy (founder, 2026-11-06). The person's own answer in My details.
-- null = not answered, {none} = no, {all} = not sure or does not know which,
-- otherwise the nuts they picked (lib/nutAllergy.ts). Own-row RLS on profiles
-- already covers it. Idempotent.
alter table public.profiles
  add column if not exists nut_allergies text[];
