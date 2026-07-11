-- Glufloat blog. Run this once in the Supabase SQL editor, after schema.sql.
--
-- The blog is the only PUBLIC content in the product: /app is behind an account,
-- but a blog post has to be readable by Google and by a stranger who has never
-- signed up, or it cannot rank and cannot feed the funnel. So the RLS policy
-- below deliberately lets anyone read a PUBLISHED post, and nothing else.
--
-- Writes never go through the browser. The admin screen posts to
-- /api/admin/posts, which checks the admin cookie and then uses the service-role
-- key, so there is no "authenticated user can insert" policy to get wrong.

create table if not exists public.posts (
  id           uuid primary key default gen_random_uuid(),
  slug         text unique not null,
  title        text not null,
  excerpt      text not null default '',   -- also the meta description
  body_md      text not null default '',
  cover_url    text,                        -- Supabase Storage public URL
  cover_alt    text,                        -- alt text, for a11y and image SEO
  author       text not null default 'The Glufloat team',
  -- Optional on purpose. Health content ranks better with a named reviewer
  -- (Google calls this E-E-A-T), but a post must still be publishable before a
  -- dietitian has looked at it. Null means "not reviewed yet", and the page
  -- simply omits the line rather than claiming a review that did not happen.
  reviewed_by  text,
  reviewed_at  timestamptz,
  tags         text[] not null default '{}',
  status       text not null default 'draft',   -- draft | published
  published_at timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  constraint posts_status_check check (status in ('draft', 'published'))
);

-- Newest published first: the one query the blog index runs.
create index if not exists posts_published_idx
  on public.posts (published_at desc)
  where status = 'published';

create index if not exists posts_slug_idx on public.posts (slug);

-- Keep updated_at honest.
create or replace function public.touch_post()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists posts_touch on public.posts;
create trigger posts_touch
  before update on public.posts
  for each row execute function public.touch_post();

-- Row Level Security -------------------------------------------------------
-- Anyone (including a signed-out visitor and Googlebot) may read a PUBLISHED
-- post. Drafts are invisible. All writes are service-role only, which bypasses
-- RLS, so no insert/update/delete policy exists by design.
alter table public.posts enable row level security;

drop policy if exists "published posts are public" on public.posts;
create policy "published posts are public"
  on public.posts for select
  using (status = 'published');

-- Cover images ---------------------------------------------------------------
-- A public bucket, because a cover image must be fetchable by Google Images and
-- by the social card scrapers.
insert into storage.buckets (id, name, public)
values ('blog', 'blog', true)
on conflict (id) do nothing;

drop policy if exists "blog images are public" on storage.objects;
create policy "blog images are public"
  on storage.objects for select
  using (bucket_id = 'blog');
