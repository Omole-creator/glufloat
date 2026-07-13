-- Who is who. Run once in the Supabase SQL editor, AFTER schema.sql,
-- blog-schema.sql, blog-analytics.sql and partners-schema.sql.
--
-- Until now every account looked the same, so a dietitian signing up to look at
-- the app was counted exactly like a person with diabetes. Health workers rarely
-- subscribe, so they were quietly dragging the trial-to-paid number down and
-- making it useless. Sign-up now asks one question, and the answer lands here.

-- 1. The column --------------------------------------------------------------
-- Nullable ON PURPOSE. Every account that existed before this was added has no
-- answer, and guessing one for them would put a lie into the numbers. They read
-- as "Not set" in the admin and are corrected by hand.
--
-- The check constraint means a fourth value can never appear by accident: a typo
-- fails loudly at the insert instead of creating a silent extra group.
alter table public.profiles
  add column if not exists user_type text;

do $$
begin
  alter table public.profiles
    add constraint profiles_user_type_check
    check (user_type in ('diabetic', 'health_pro', 'caregiver'));
exception
  when duplicate_object then null;   -- already there; re-running this file is safe
end $$;

create index if not exists profiles_user_type_idx on public.profiles (user_type);

-- 2. Carry the answer through sign-up ----------------------------------------
-- The sign-up form puts the answer into the new user's metadata, next to the
-- name, the blog post and the partner code. This trigger copies it onto the
-- profile.
--
-- This is the FOURTH rewrite of this function, and it REPLACES the one in
-- partners-schema.sql. It now copies FIVE things: name, email, source_post,
-- partner_id, user_type. Drop one while editing and that feature dies silently,
-- with no error anywhere. After touching it, sign up a real account that came
-- from no partner and no blog post, and check it still gets a profile, a name
-- and a trial.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_partner uuid;
begin
  select id into v_partner
    from public.partners
   where code = nullif(new.raw_user_meta_data->>'partner_code', '')
     and active;

  insert into public.profiles (id, name, email, source_post, partner_id, user_type)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', ''),
    new.email,
    nullif(new.raw_user_meta_data->>'source_post', ''),
    v_partner,
    -- nullif so a blank answer lands as "Not set", never as an empty group.
    nullif(new.raw_user_meta_data->>'user_type', '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
