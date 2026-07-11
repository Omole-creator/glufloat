import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * Record a blog event. Public, because it is called from a static blog page by
 * a reader who is not signed in.
 *
 * That means anyone can POST here, so it is deliberately strict and deliberately
 * boring: three allowed event names, a slug that must look like a slug, and a
 * visitor id that must look like the random one we generate. Nothing else is
 * read from the request. No IP address is stored, no header is logged, and there
 * is no personal data to leak.
 *
 * It always answers 204, even when it refuses. A tracker must never tell a
 * caller anything, and must never break the page it sits on.
 */
const EVENTS = new Set(["view", "read", "cta"]);
const SLUG = /^[a-z0-9-]{1,80}$/;
const VISITOR = /^[a-z0-9-]{8,40}$/;

const ok = () => new NextResponse(null, { status: 204 });

export async function POST(request: Request) {
  try {
    const { slug, event, visitor } = await request.json();

    if (
      typeof slug !== "string" || !SLUG.test(slug) ||
      typeof event !== "string" || !EVENTS.has(event) ||
      typeof visitor !== "string" || !VISITOR.test(visitor)
    ) {
      return ok();
    }

    await createAdminClient().from("post_events").insert({ slug, event, visitor });
  } catch {
    /* Analytics must never break the page. Swallow everything. */
  }
  return ok();
}
