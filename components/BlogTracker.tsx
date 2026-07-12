"use client";

import { useEffect, useRef } from "react";
import { rememberSourcePost, trackPost } from "@/lib/attribution";

/**
 * Measures one blog post. Renders nothing.
 *
 * Three events, which together make a funnel:
 *   view  they opened it
 *   read  they reached the bottom, so they actually read it
 *   cta   they clicked the free-trial button
 *
 * **Each one is sent at most ONCE per device, per post, for good.** One person
 * who opens the same post on ten different days is one person who read it, not
 * ten. The mark is kept in localStorage, so it survives closing the tab, closing
 * the browser, and coming back next week.
 *
 * It used to be sessionStorage, which only guarded a single browsing session:
 * every fresh visit from the same phone wrote another row, and the raw count on
 * the admin screen quietly grew with re-reads. If storage is blocked (private
 * mode), the event is sent and the same-person guard is lost. That is the right
 * way round: a number slightly too high beats a post that looks like nobody read
 * it.
 */
function once(key: string, send: () => void): void {
  try {
    if (localStorage.getItem(key)) return;
    localStorage.setItem(key, "1");
  } catch {
    /* storage blocked: send it anyway rather than lose the reader entirely */
  }
  send();
}

export default function BlogTracker({ slug }: { slug: string }) {
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // This post is now the one that brought them here, if none did before.
    rememberSourcePost(slug);

    once(`gf_seen_${slug}`, () => trackPost(slug, "view"));

    // "Read" = the bottom of the article came into view.
    const target = endRef.current;
    if (!target) return;

    const io = new IntersectionObserver(
      (entries) => {
        if (!entries[0]?.isIntersecting) return;
        once(`gf_read_${slug}`, () => trackPost(slug, "read"));
        io.disconnect();
      },
      { threshold: 0.5 },
    );
    io.observe(target);
    return () => io.disconnect();
  }, [slug]);

  return <div ref={endRef} aria-hidden className="h-px w-full" />;
}

/** Wraps the free-trial button on a post, so a click is counted. Once per device. */
export function CtaTracker({
  slug,
  children,
}: {
  slug: string;
  children: React.ReactNode;
}) {
  return (
    <span
      onClick={() => once(`gf_cta_${slug}`, () => trackPost(slug, "cta"))}
      className="contents"
    >
      {children}
    </span>
  );
}
