-- #35 "Which meal was this?" (founder, 2026-10-23).
-- When somebody taps "I already ate it", the app asks which meal it was, so a
-- lunch saved at 7pm counts as lunch and their dinner stays its normal size.
-- Empty on every older row and on meals saved some other way: those still
-- count by the time they were saved. A new column on an existing table, so no
-- new grants are needed. Safe to run twice.
alter table public.meal_checks add column if not exists meal text;
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'meal_checks_meal_check') then
    alter table public.meal_checks
      add constraint meal_checks_meal_check check (meal in ('breakfast', 'lunch', 'dinner'));
  end if;
end $$;
