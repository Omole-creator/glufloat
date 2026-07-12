"use client";

import { useEffect, useState } from "react";

/**
 * A thin bar under the navbar showing how far through the article the reader
 * is. It is decoration, and it fails quietly: no article element, no bar.
 */
export default function ReadingProgress({ targetId }: { targetId: string }) {
  const [pct, setPct] = useState(0);

  useEffect(() => {
    const el = document.getElementById(targetId);
    if (!el) return;

    const onScroll = () => {
      const start = el.offsetTop;
      const total = el.offsetHeight - window.innerHeight;
      if (total <= 0) return setPct(0);
      const done = (window.scrollY - start) / total;
      setPct(Math.min(100, Math.max(0, done * 100)));
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [targetId]);

  return (
    <div
      className="fixed inset-x-0 top-16 z-40 h-1 bg-transparent"
      aria-hidden
    >
      <div
        className="h-full bg-gradient-to-r from-brand to-leaf transition-[width] duration-150 ease-out"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
