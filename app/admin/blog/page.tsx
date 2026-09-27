import { cookies } from "next/headers";
import { Newspaper } from "lucide-react";
import { ADMIN_COOKIE, adminToken } from "@/lib/adminAuth";
import { createAdminClient } from "@/lib/supabase/server";
import AdminLogin from "../AdminLogin";
import AdminShell from "../AdminShell";
import BlogEditor from "./BlogEditor";
import BlogStats from "./BlogStats";
import AdminSection, { AdminJump } from "../AdminSection";
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
      icon={<Newspaper className="h-5 w-5" strokeWidth={2.2} />}
      width="max-w-5xl"
    >
      <>
        <AdminJump
          items={[
            { id: "blog-stats", label: "How the blog is doing" },
            { id: "blog-write", label: "Write and edit posts" },
          ]}
        />
        <AdminSection id="blog-stats" title="How the blog is doing">
          <BlogStats posts={(data ?? []) as Post[]} />
        </AdminSection>
        <AdminSection id="blog-write" title="Write and edit posts">
          <BlogEditor initial={(data ?? []) as Post[]} />
        </AdminSection>
      </>
    </AdminShell>
  );
}
