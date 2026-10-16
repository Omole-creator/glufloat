"use client";

import { useState } from "react";
import { Copy, Send } from "lucide-react";

/** The agent's link for doctors, to copy or send on WhatsApp. */
export default function AgentShare({ link }: { link: string }) {
  const [copied, setCopied] = useState(false);
  const text = `Doctor, GluFloat helps your patients with diabetes know what to eat and how much, and lets you see their meals, sugar tests and reports between visits. It is free for doctors. Sign up here:\n${link}`;
  return (
    <div>
      <p className="break-all rounded-2xl bg-white/12 px-4 py-3 font-mono text-sm text-white ring-1 ring-inset ring-white/20">{link}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <a
          href={`https://wa.me/?text=${encodeURIComponent(text)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-full bg-[#25D366] px-5 py-2.5 text-sm font-bold text-white hover:brightness-95"
        >
          <Send className="h-4 w-4" /> Send to a doctor on WhatsApp
        </a>
        <button
          type="button"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(link);
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            } catch {
              /* ignore */
            }
          }}
          className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-bold text-brand hover:bg-white/90"
        >
          <Copy className="h-4 w-4" /> {copied ? "Copied" : "Copy link"}
        </button>
      </div>
    </div>
  );
}
