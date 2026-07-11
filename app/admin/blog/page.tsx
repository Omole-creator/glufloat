import { cookies } from "next/headers";
import Link from "next/link";
import { ADMIN_COOKIE, adminToken } from "@/lib/adminAuth";
import { createAdminClient } from "@/lib/supabase/server";
import AdminLogin from "../AdminLogin";
import BlogEditor from "./BlogEditor";
import BlogStats from "./BlogStats";
import type { Post } from "@/lib/blog";

export const dynamic = "force-dynamic";

export default async function AdminBlogPage() {
  const c = await cookies();
  const authed =
    !!process.env.ADMIN_PASSWORD && c.get(ADMIN_COOKIE)?.value === adminToken();
  if (!authed) return <AdminLogin />;

  // Drafts included: this is the only screen that may see them.
  const { data } = await createAdminClient()
    .from("posts")
    .select("*")
    .order("updated_at", { ascending: false });

  return (
    <main className="min-h-screen bg-mist px-5 py-10">
      <div className="mx-auto max-w-5xl">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="font-display text-3xl font-bold text-ink">Blog posts</h1>
            <p className="mt-1 text-ink-soft">
              Write a post, publish it, and it goes live on the site and into
              Google straight away.
            </p>
          </div>
          <Link
            href="/admin"
            className="rounded-full border border-line bg-white px-5 py-2 font-display font-bold text-ink hover:border-brand"
          >
            Back to dashboard
          </Link>
        </div>

        <BlogStats posts={(data ?? []) as Post[]} />

        <BlogEditor initial={(data ?? []) as Post[]} />
      </div>
    </main>
  );
}
