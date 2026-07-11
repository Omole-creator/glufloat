import { createClient } from "@supabase/supabase-js";

/**
 * Reading blog posts.
 *
 * These run in Server Components, and the whole point of the blog is that the
 * post text is in the HTML Google receives. So they must NOT use the cookie-
 * bound Supabase client from lib/supabase/server.ts: touching cookies() opts the
 * route into dynamic rendering, the page stops being statically generated, and
 * you quietly lose the thing you built the blog for.
 *
 * A plain anon client has no cookies, so /blog and /blog/[slug] stay static and
 * are rebuilt on publish (see revalidatePath in app/api/admin/posts/route.ts).
 * The anon key is safe here: RLS only exposes rows where status = 'published'.
 */
function publicClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

export type Post = {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  body_md: string;
  cover_url: string | null;
  cover_alt: string | null;
  author: string;
  /** Optional. Null means nobody has reviewed it yet, and the page says nothing. */
  reviewed_by: string | null;
  reviewed_at: string | null;
  tags: string[];
  status: "draft" | "published";
  published_at: string | null;
  created_at: string;
  updated_at: string;
};

/** Cards for the index and the sitemap. Newest first. Never includes drafts. */
export async function getPublishedPosts(): Promise<Post[]> {
  const { data, error } = await publicClient()
    .from("posts")
    .select("*")
    .eq("status", "published")
    .order("published_at", { ascending: false });

  // A blog that cannot reach its database must not take the whole site down.
  // An empty list renders "no posts yet", which is survivable; a throw here
  // would 500 the page for a visitor and for Googlebot.
  if (error) {
    console.error("[blog] getPublishedPosts:", error.message);
    return [];
  }
  return (data ?? []) as Post[];
}

/** One published post, or null. Null becomes a 404, which is the honest answer. */
export async function getPostBySlug(slug: string): Promise<Post | null> {
  const { data, error } = await publicClient()
    .from("posts")
    .select("*")
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();

  if (error) {
    console.error("[blog] getPostBySlug:", error.message);
    return null;
  }
  return (data as Post) ?? null;
}

/** Posts other than this one, for the "read next" links. */
export function relatedTo(post: Post, all: Post[], limit = 3): Post[] {
  const others = all.filter((p) => p.id !== post.id);
  const shared = (p: Post) => p.tags.filter((t) => post.tags.includes(t)).length;
  return [...others]
    .sort((a, b) => shared(b) - shared(a))
    .slice(0, limit);
}

/** "11 July 2026" — the way a date is read here, not "7/11/2026". */
export function longDate(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

/** Turn a title into a URL slug. Used by the admin editor. */
export function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 70);
}
