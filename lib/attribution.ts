"use client";

/**
 * Who came from which post.
 *
 * Two things live in the reader's own browser, and neither identifies anybody:
 *
 *   gf_visitor  a random id, so ten page views from one person are counted as
 *               one person. It is not a name, an email, or a fingerprint, and it
 *               never leaves their device except as this random string.
 *
 *   gf_src_post the FIRST blog post they ever landed on. First touch, not last:
 *               the post that introduced them to Glufloat earned the credit,
 *               even if they read three more before signing up. So it is only
 *               ever written once.
 *
 * At sign-up, gf_src_post is passed into the account, and the admin screen can
 * then say "this post produced 4 paying subscribers", which no page-view counter
 * can tell you.
 */

const VISITOR_KEY = "gf_visitor";
const SOURCE_KEY = "gf_src_post";

/** A random id for this browser. Made once, then reused. */
export function visitorId(): string {
  try {
    let id = localStorage.getItem(VISITOR_KEY);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(VISITOR_KEY, id);
    }
    return id;
  } catch {
    // Private mode, or storage blocked. Use a throwaway id rather than fail.
    return "anon-" + Math.random().toString(36).slice(2, 10);
  }
}

/** Remember the first post this person landed on. Never overwrite it. */
export function rememberSourcePost(slug: string): void {
  try {
    if (!localStorage.getItem(SOURCE_KEY)) localStorage.setItem(SOURCE_KEY, slug);
  } catch {
    /* ignore */
  }
}

/** The post that first brought them here, if any. */
export function sourcePost(): string {
  try {
    return localStorage.getItem(SOURCE_KEY) ?? "";
  } catch {
    return "";
  }
}

/**
 * The partner who sent this visitor, if any.
 *
 * Set as a cookie by /r/[code] on the server, because first touch has to be
 * enforced somewhere the visitor cannot fiddle with it. Read here so the sign-up
 * form can carry it into the new account.
 */
export function partnerCode(): string {
  try {
    const hit = document.cookie
      .split(";")
      .map((c) => c.trim())
      .find((c) => c.startsWith("gf_ref="));
    return hit ? decodeURIComponent(hit.slice("gf_ref=".length)) : "";
  } catch {
    return "";
  }
}

/**
 * Send one event. Fire-and-forget, and `keepalive` so it still arrives when the
 * reader is closing the tab (which is exactly when the "read to the end" event
 * fires).
 */
export function trackPost(slug: string, event: "view" | "read" | "cta"): void {
  try {
    fetch("/api/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug, event, visitor: visitorId() }),
      keepalive: true,
    }).catch(() => {});
  } catch {
    /* never break the page */
  }
}
