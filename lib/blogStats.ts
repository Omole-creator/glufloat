import { createAdminClient } from "@/lib/supabase/server";

/**
 * How each blog post is actually doing.
 *
 * The funnel, in order, and each step is a real thing that happened:
 *
 *   opened   somebody opened the post          (unique people, not page loads)
 *   read     they reached the bottom of it     (so the post held them)
 *   clicked  they clicked the free-trial button
 *   signedUp they made an account, and THIS post is the one that first brought
 *            them to Glufloat
 *   trials   of those, how many started the 3 days
 *   paid     of those, how many are paying now
 *
 * `paid` is the only number that matters in the end, and it is the one a page-
 * view counter can never give you. Everything above it explains why it is the
 * size it is: a post with many opens and few reads has a boring middle; many
 * reads and few clicks has a weak call to action; many clicks and few sign-ups
 * means the sign-up page is losing them, not the post.
 *
 * Server-only: uses the service-role key.
 */

export type PostStats = {
  slug: string;
  views: number;      // raw page opens, including repeat visits
  opened: number;     // unique people
  read: number;       // unique people who reached the bottom
  clicked: number;    // unique people who clicked the trial button
  signedUp: number;
  trials: number;
  paid: number;
};

export type BlogStats = {
  byPost: Map<string, PostStats>;
  totals: PostStats;
  /** Sign-ups that no blog post can claim (came from the landing page, etc). */
  signupsNotFromBlog: number;
};

const empty = (slug: string): PostStats => ({
  slug,
  views: 0,
  opened: 0,
  read: 0,
  clicked: 0,
  signedUp: 0,
  trials: 0,
  paid: 0,
});

export async function getBlogStats(): Promise<BlogStats> {
  const admin = createAdminClient();

  const [{ data: events }, { data: profiles }, { data: subs }] = await Promise.all([
    admin.from("post_events").select("slug,event,visitor"),
    admin.from("profiles").select("id,source_post,trial_start"),
    admin.from("subscriptions").select("user_id,status,current_period_end"),
  ]);

  const byPost = new Map<string, PostStats>();
  const get = (slug: string) => {
    if (!byPost.has(slug)) byPost.set(slug, empty(slug));
    return byPost.get(slug)!;
  };

  // Unique people per post per event. A visitor who opens a post five times is
  // one person who opened it, and five views.
  const uniq = new Map<string, Set<string>>(); // `${slug}|${event}` -> visitors
  for (const e of events ?? []) {
    const s = get(e.slug);
    if (e.event === "view") s.views += 1;
    const key = `${e.slug}|${e.event}`;
    if (!uniq.has(key)) uniq.set(key, new Set());
    uniq.get(key)!.add(e.visitor);
  }
  for (const [key, set] of uniq) {
    const [slug, event] = key.split("|");
    const s = get(slug);
    if (event === "view") s.opened = set.size;
    if (event === "read") s.read = set.size;
    if (event === "cta") s.clicked = set.size;
  }

  // Who is paying right now.
  const now = Date.now();
  const paying = new Set(
    (subs ?? [])
      .filter(
        (s) =>
          (s.status === "active" || s.status === "non-renewing") &&
          s.current_period_end &&
          new Date(s.current_period_end).getTime() > now,
      )
      .map((s) => s.user_id),
  );

  let signupsNotFromBlog = 0;
  for (const p of profiles ?? []) {
    if (!p.source_post) {
      signupsNotFromBlog += 1;
      continue;
    }
    const s = get(p.source_post);
    s.signedUp += 1;
    if (p.trial_start) s.trials += 1;
    if (paying.has(p.id)) s.paid += 1;
  }

  const totals = empty("all posts");
  for (const s of byPost.values()) {
    totals.views += s.views;
    totals.opened += s.opened;   // people can appear under two posts; close enough
    totals.read += s.read;
    totals.clicked += s.clicked;
    totals.signedUp += s.signedUp;
    totals.trials += s.trials;
    totals.paid += s.paid;
  }

  return { byPost, totals, signupsNotFromBlog };
}

/** "12%" or "-" when there is nothing to divide by. */
export function rate(top: number, bottom: number): string {
  if (!bottom) return "-";
  return Math.round((top / bottom) * 100) + "%";
}
