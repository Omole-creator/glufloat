-- Glufloat blog analytics. Run once in the Supabase SQL editor, after
-- blog-schema.sql.
--
-- The question this answers: "which blog post is actually bringing me paying
-- customers?" Vercel Analytics can count page views, but it cannot join a view
-- to a sign-up, so it can never tell you that. This can.
--
-- Privacy: no IP address, no name, no email, no fingerprint is stored. A visitor
-- gets a RANDOM id generated in their own browser and kept in their own
-- localStorage. It identifies nobody. It exists only so that ten page views from
-- one person are not counted as ten people.

-- 1. Raw events -------------------------------------------------------------
-- Three events per post: 'view' (opened it), 'read' (reached the bottom), 'cta'
-- (clicked the free-trial button). Together they are a funnel: how many opened
-- it, how many actually read it, how many wanted the product.
create table if not exists public.post_events (
  id         bigint generated always as identity primary key,
  slug       text not null,
  event      text not null,
  visitor    text not null,              -- random, browser-generated. Not a person.
  created_at timestamptz not null default now(),
  constraint post_events_event_check check (event in ('view', 'read', 'cta'))
);

create index if not exists post_events_slug_idx on public.post_events (slug);
create index if not exists post_events_created_idx on public.post_events (created_at desc);
-- Counting unique readers per post is the most common query; this serves it.
create index if not exists post_events_slug_visitor_idx
  on public.post_events (slug, event, visitor);

-- Nobody may read or write this from the browser. The tracking route and the
-- admin dashboard both use the service-role key, which bypasses RLS. With RLS on
-- and no policy, the anon key can do nothing at all here.
alter table public.post_events enable row level security;

-- 2. Attribution ------------------------------------------------------------
-- The blog post a user first arrived on, stamped on their profile at sign-up.
-- FIRST touch, not last: the post that introduced them to Glufloat is the one
-- that earned the credit, even if they read three more before signing up.
alter table public.profiles
  add column if not exists source_post text;

create index if not exists profiles_source_post_idx on public.profiles (source_post);

-- 3. Carry the source through sign-up ---------------------------------------
-- The sign-up form puts the post slug into the auth user's metadata. This
-- trigger already copies the name across; it now copies the source too. Replaces
-- the function in schema.sql -- keep the two in step if either changes.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, name, email, source_post)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', ''),
    new.email,
    nullif(new.raw_user_meta_data->>'source_post', '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
