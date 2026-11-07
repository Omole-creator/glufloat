"use client";

import { useState } from "react";
import { Copy } from "lucide-react";

/** Copy the creator's link, or the talking points, with one tap. */
export default function CreatorShare({ link, points }: { link: string; points?: string }) {
  const [copied, setCopied] = useState<"" | "link" | "points">("");
  const copy = async (what: "link" | "points", text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(what);
      setTimeout(() => setCopied(""), 2000);
    } catch {
      /* ignore */
    }
  };
  return (
    <div>
      <p className="break-all rounded-2xl bg-white/12 px-4 py-3 font-mono text-base font-semibold text-white ring-1 ring-inset ring-white/20">{link}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => copy("link", link)}
          className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-bold text-brand hover:bg-white/90"
        >
          <Copy className="h-4 w-4" /> {copied === "link" ? "Copied" : "Copy your link"}
        </button>
        {points && (
          <button
            type="button"
            onClick={() => copy("points", points)}
            className="inline-flex items-center gap-2 rounded-full bg-white/15 px-5 py-2.5 text-sm font-bold text-white ring-1 ring-inset ring-white/30 hover:bg-white/20"
          >
            <Copy className="h-4 w-4" /> {copied === "points" ? "Copied" : "Copy what to say"}
          </button>
        )}
      </div>
    </div>
  );
}
