import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { ADMIN_COOKIE, adminToken } from "@/lib/adminAuth";
import { createAdminClient } from "@/lib/supabase/server";
import { slugify } from "@/lib/blog";

export const dynamic = "force-dynamic";

/**
 * Create, update and delete blog posts.
 *
 * Every write goes through here, never through the browser's Supabase client.
 * That is why `posts` has no insert/update policy: the only way in is this
 * route, it demands the admin cookie, and only then does it use the service-role
 * key. A visitor with the anon key can read published posts and nothing else.
 */
async function requireAdmin(): Promise<boolean> {
  const c = await cookies();
  return (
    !!process.env.ADMIN_PASSWORD && c.get(ADMIN_COOKIE)?.value === adminToken()
  );
}

/**
 * Rebuild the static pages a post appears on.
 *
 * /blog and /blog/[slug] are statically generated, which is the whole reason
 * Google sees the article text. The cost of that is that they do not change on
 * their own: without these calls a newly published post would sit in the
 * database and never appear on the site. The sitemap and feed must be rebuilt
 * too, or the post exists but is never announced.
 */
function rebuild(slug: string) {
  revalidatePath("/blog");
  revalidatePath(`/blog/${slug}`);
  revalidatePath("/sitemap.xml");
  revalidatePath("/blog/rss.xml");
}

type Body = {
  id?: string;
  slug?: string;
  title?: string;
  excerpt?: string;
  body_md?: string;
  cover_url?: string | null;
  cover_alt?: string | null;
  author?: string;
  reviewed_by?: string | null;
  reviewed_at?: string | null;
  tags?: string[];
  status?: "draft" | "published";
};

/** List every post, drafts included. Only the admin screen calls this. */
export async function GET() {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Not allowed" }, { status: 401 });
  }
  const { data, error } = await createAdminClient()
    .from("posts")
    .select("*")
    .order("updated_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ posts: data ?? [] });
}

export async function POST(request: Request) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Not allowed" }, { status: 401 });
  }

  const b = (await request.json().catch(() => ({}))) as Body;

  const title = (b.title ?? "").trim();
  if (!title) {
    return NextResponse.json({ error: "A post needs a title." }, { status: 400 });
  }

  const status = b.status === "published" ? "published" : "draft";
  const slug = (b.slug?.trim() || slugify(title)).toLowerCase();
  if (!slug) {
    return NextResponse.json(
      { error: "That title makes an empty web address. Add some letters or numbers." },
      { status: 400 },
    );
  }

  // An empty reviewer must be stored as NULL, not as "". The post page tests for
  // truthiness to decide whether to show the "Checked by" line, and an empty
  // string would render a badge that says nothing.
  const reviewed_by = b.reviewed_by?.trim() || null;

  const row = {
    slug,
    title,
    excerpt: (b.excerpt ?? "").trim(),
    body_md: b.body_md ?? "",
    cover_url: b.cover_url || null,
    cover_alt: b.cover_alt?.trim() || null,
    author: b.author?.trim() || "The Glufloat team",
    reviewed_by,
    // Only stamp a review date when there is actually a reviewer.
    reviewed_at: reviewed_by ? (b.reviewed_at ?? new Date().toISOString()) : null,
    tags: (b.tags ?? []).map((t) => t.trim()).filter(Boolean),
    status,
  };

  const admin = createAdminClient();

  if (b.id) {
    // Publishing an already-published post must not move its published_at, or
    // every edit would look to Google like a brand new article.
    const { data: existing } = await admin
      .from("posts")
      .select("published_at,status")
      .eq("id", b.id)
      .maybeSingle();

    const published_at =
      status === "published"
        ? (existing?.published_at ?? new Date().toISOString())
        : null;

    const { data, error } = await admin
      .from("posts")
      .update({ ...row, published_at })
      .eq("id", b.id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: friendly(error.message) }, { status: 400 });
    }
    // Rebuild the old slug too, or a renamed post lingers at its old address.
    if (existing && data.slug !== slug) rebuild(data.slug);
    rebuild(slug);
    return NextResponse.json({ post: data });
  }

  const { data, error } = await admin
    .from("posts")
    .insert({
      ...row,
      published_at: status === "published" ? new Date().toISOString() : null,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: friendly(error.message) }, { status: 400 });
  }
  rebuild(slug);
  return NextResponse.json({ post: data });
}

export async function DELETE(request: Request) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Not allowed" }, { status: 401 });
  }
  const { id } = (await request.json().catch(() => ({}))) as { id?: string };
  if (!id) return NextResponse.json({ error: "No post given." }, { status: 400 });

  const admin = createAdminClient();
  const { data } = await admin.from("posts").select("slug").eq("id", id).maybeSingle();
  const { error } = await admin.from("posts").delete().eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (data?.slug) rebuild(data.slug);
  return NextResponse.json({ ok: true });
}

/** Turn a database error into something a person can act on. */
function friendly(message: string): string {
  if (/duplicate key|unique/i.test(message)) {
    return "Another post already uses that web address. Change the address and try again.";
  }
  return message;
}
