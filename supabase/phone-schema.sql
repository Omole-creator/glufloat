-- A phone number for every new account. Run once in the Supabase SQL editor,
-- AFTER schema.sql, blog-schema.sql, blog-analytics.sql, partners-schema.sql
-- and user-type-schema.sql.
--
-- Why: we had 32 sign-ups and could not ring or WhatsApp a single one of them to
-- ask why they did not stay. Sign-up now asks for a phone, and the answer lands
-- here so we can reach people to help them and learn from them.

-- 1. The column --------------------------------------------------------------
-- Nullable ON PURPOSE. Every account made before this was added has no phone,
-- and inventing one would put a lie into the list. New sign-ups require it in the
-- form, so only the old accounts read as blank.
alter table public.profiles
  add column if not exists phone text;

-- 2. Carry the number through sign-up ----------------------------------------
-- The sign-up form puts the phone into the new user's metadata, next to the
-- name, the blog post, the partner code and the user type. This trigger copies
-- it onto the profile.
--
-- This is the FIFTH rewrite of this function, and it REPLACES the one in
-- user-type-schema.sql. It now copies SIX things: name, email, source_post,
-- partner_id, user_type, phone. Drop one while editing and that feature dies
-- silently, with no error anywhere. After touching it, sign up a real account
-- that came from no partner and no blog post, and check it still gets a profile,
-- a name, a trial and a phone.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_partner uuid;
begin
  select id into v_partner
    from public.partners
   where code = nullif(new.raw_user_meta_data->>'partner_code', '')
     and active;

  insert into public.profiles (id, name, email, source_post, partner_id, user_type, phone)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', ''),
    new.email,
    nullif(new.raw_user_meta_data->>'source_post', ''),
    v_partner,
    -- nullif so a blank answer lands as "Not set", never as an empty group.
    nullif(new.raw_user_meta_data->>'user_type', ''),
    nullif(new.raw_user_meta_data->>'phone', '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
