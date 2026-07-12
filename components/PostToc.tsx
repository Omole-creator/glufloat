"use client";

import { useEffect, useState } from "react";
import type { Heading } from "@/lib/markdown";

/**
 * "On this page". The headings are handed in from the server (they are already
 * in the pre-rendered HTML, so Google sees the list too); the only client work
 * is lighting up the section the reader is currently in.
 */
export default function PostToc({ headings }: { headings: Heading[] }) {
  const [active, setActive] = useState(headings[0]?.id ?? "");

  useEffect(() => {
    const nodes = headings
      .map((h) => document.getElementById(h.id))
      .filter((n): n is HTMLElement => !!n);
    if (!nodes.length) return;

    const io = new IntersectionObserver(
      (entries) => {
        const seen = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (seen) setActive(seen.target.id);
      },
      // A band across the upper third of the screen: a heading is "current"
      // once it reaches the top area, not when it first peeks in at the bottom.
      { rootMargin: "-96px 0px -70% 0px", threshold: 0 },
    );

    nodes.forEach((n) => io.observe(n));
    return () => io.disconnect();
  }, [headings]);

  return (
    <nav aria-label="On this page" className="text-sm">
      <p className="font-display text-xs font-bold uppercase tracking-[0.15em] text-ink-soft/70">
        On this page
      </p>
      <ul className="mt-4 space-y-1 border-l border-line">
        {headings.map((h) => (
          <li key={h.id}>
            <a
              href={`#${h.id}`}
              className={`-ml-px block border-l-2 py-1.5 leading-snug transition-colors ${
                h.level === 3 ? "pl-7" : "pl-4"
              } ${
                active === h.id
                  ? "border-brand font-semibold text-brand"
                  : "border-transparent text-ink-soft hover:border-line hover:text-ink"
              }`}
            >
              {h.text}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
