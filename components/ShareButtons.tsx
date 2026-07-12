"use client";

import { useState } from "react";
import { Check, Link2, Share2 } from "lucide-react";

/**
 * Share a post. WhatsApp comes first on purpose: it is how this audience
 * actually passes something to a relative who has diabetes.
 *
 * The share targets are plain links, so they work with no JavaScript beyond the
 * copy button, and nothing is loaded from a third party (no Facebook or Twitter
 * widget script watching our readers).
 */
export default function ShareButtons({
  url,
  title,
  size = "md",
}: {
  url: string;
  title: string;
  /** "sm" for the tight row under the headline, "md" for the block at the end. */
  size?: "sm" | "md";
}) {
  const [copied, setCopied] = useState(false);

  const u = encodeURIComponent(url);
  const t = encodeURIComponent(title);

  const targets = [
    {
      name: "WhatsApp",
      href: `https://wa.me/?text=${t}%20${u}`,
      className: "hover:border-[#25D366] hover:text-[#128C4B]",
      icon: (
        <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4" aria-hidden>
          <path d="M17.5 14.4c-.3-.2-1.7-.9-2-1-.3-.1-.5-.2-.7.1-.2.3-.7 1-.9 1.2-.2.2-.3.2-.6.1-.3-.2-1.2-.5-2.3-1.4-.9-.8-1.4-1.7-1.6-2-.2-.3 0-.5.1-.6l.5-.5c.1-.2.2-.3.3-.5v-.5c-.1-.2-.7-1.6-.9-2.2-.3-.6-.5-.5-.7-.5h-.6c-.2 0-.5.1-.8.4-.3.3-1 1-1 2.5s1.1 2.9 1.2 3.1c.2.2 2.1 3.2 5.1 4.5.7.3 1.3.5 1.7.6.7.2 1.4.2 1.9.1.6-.1 1.7-.7 2-1.4.2-.7.2-1.3.2-1.4-.1-.1-.3-.2-.6-.3M12 2A10 10 0 0 0 2 12c0 1.8.5 3.4 1.3 4.9L2 22l5.3-1.4A10 10 0 1 0 12 2m0 1.8a8.2 8.2 0 1 1-4.3 15.2l-.3-.2-3.1.8.8-3-.2-.3A8.2 8.2 0 0 1 12 3.8" />
        </svg>
      ),
    },
    {
      name: "Facebook",
      href: `https://www.facebook.com/sharer/sharer.php?u=${u}`,
      className: "hover:border-[#1877F2] hover:text-[#1877F2]",
      icon: (
        <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4" aria-hidden>
          <path d="M22 12a10 10 0 1 0-11.6 9.9v-7H7.9V12h2.5V9.8c0-2.5 1.5-3.9 3.8-3.9 1.1 0 2.2.2 2.2.2v2.5h-1.3c-1.2 0-1.6.8-1.6 1.6V12h2.8l-.4 2.9h-2.4v7A10 10 0 0 0 22 12" />
        </svg>
      ),
    },
    {
      name: "X",
      href: `https://twitter.com/intent/tweet?text=${t}&url=${u}`,
      className: "hover:border-ink hover:text-ink",
      icon: (
        <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4" aria-hidden>
          <path d="M18.2 2H21l-6.4 7.3L22 22h-5.9l-4.6-6-5.3 6H3.4l6.8-7.8L2.3 2h6l4.2 5.5L18.2 2Zm-1 18.3h1.6L7.9 3.6H6.2l11 16.7Z" />
        </svg>
      ),
    },
  ];

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard blocked (old browser, no https). The native sheet is the
      // fallback, and failing that the reader still has the address bar.
      if (navigator.share) void navigator.share({ title, url });
    }
  }

  const btn =
    "inline-flex items-center gap-1.5 rounded-full border border-line bg-white px-3.5 py-2 text-sm font-semibold text-ink-soft transition-colors";

  return (
    <div className="flex flex-wrap items-center gap-2">
      {size === "md" && (
        <span className="mr-1 inline-flex items-center gap-1.5 font-display text-sm font-bold text-ink">
          <Share2 className="h-4 w-4 text-brand" />
          Share this
        </span>
      )}

      {targets.map((s) => (
        <a
          key={s.name}
          href={s.href}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Share on ${s.name}`}
          title={`Share on ${s.name}`}
          className={`${btn} ${s.className}`}
        >
          {s.icon}
          <span className={size === "sm" ? "sr-only sm:not-sr-only" : ""}>{s.name}</span>
        </a>
      ))}

      <button
        type="button"
        onClick={copy}
        aria-label="Copy the link"
        title="Copy the link"
        className={`${btn} hover:border-brand hover:text-brand`}
      >
        {copied ? (
          <Check className="h-4 w-4 text-leaf-deep" />
        ) : (
          <Link2 className="h-4 w-4" />
        )}
        <span className={size === "sm" ? "sr-only sm:not-sr-only" : ""}>
          {copied ? "Copied" : "Copy link"}
        </span>
      </button>
    </div>
  );
}
