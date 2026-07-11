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
 * The "view" fires once per browser session per post. Without that guard, React
 * Strict Mode in development double-fires it, and a reader who navigates back to
 * the post counts twice, which would quietly inflate every number on the admin
 * screen.
 */
export default function BlogTracker({ slug }: { slug: string }) {
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // This post is now the one that brought them here, if none did before.
    rememberSourcePost(slug);

    const seenKey = `gf_seen_${slug}`;
    try {
      if (!sessionStorage.getItem(seenKey)) {
        sessionStorage.setItem(seenKey, "1");
        trackPost(slug, "view");
      }
    } catch {
      trackPost(slug, "view");
    }

    // "Read" = the bottom of the article came into view.
    const target = endRef.current;
    if (!target) return;

    const readKey = `gf_read_${slug}`;
    const io = new IntersectionObserver(
      (entries) => {
        if (!entries[0]?.isIntersecting) return;
        try {
          if (sessionStorage.getItem(readKey)) return;
          sessionStorage.setItem(readKey, "1");
        } catch {
          /* ignore */
        }
        trackPost(slug, "read");
        io.disconnect();
      },
      { threshold: 0.5 },
    );
    io.observe(target);
    return () => io.disconnect();
  }, [slug]);

  return <div ref={endRef} aria-hidden className="h-px w-full" />;
}

/** Wraps the free-trial button on a post, so a click is counted. */
export function CtaTracker({
  slug,
  children,
}: {
  slug: string;
  children: React.ReactNode;
}) {
  return (
    <span onClick={() => trackPost(slug, "cta")} className="contents">
      {children}
    </span>
  );
}
