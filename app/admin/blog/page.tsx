import { cookies } from "next/headers";
import { ADMIN_COOKIE, adminToken } from "@/lib/adminAuth";
import { createAdminClient } from "@/lib/supabase/server";
import AdminLogin from "../AdminLogin";
import AdminShell from "../AdminShell";
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
    <AdminShell
      title="Blog posts"
      intro="Write a post, publish it, and it goes live on the site and into Google straight away."
      width="max-w-5xl"
    >
      <>
        <BlogStats posts={(data ?? []) as Post[]} />
        <BlogEditor initial={(data ?? []) as Post[]} />
      </>
    </AdminShell>
  );
}
