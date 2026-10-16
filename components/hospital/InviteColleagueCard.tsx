"use client";

import { useState } from "react";
import { Copy, Send, UserPlus } from "lucide-react";
import { COLLEAGUE_BONUS_KOBO, nairaFromKobo } from "@/lib/careFees";

/**
 * A GluFloat doctor invites a colleague (founder, 2026-10-16): their own link,
 * /d/<their code>. When the colleague's first patient subscribes, the doctor
 * who invited them gets N3,000, once.
 */
export default function InviteColleagueCard({ link }: { link: string }) {
  const [copied, setCopied] = useState(false);
  const text = `I use GluFloat to look after my patients' diabetes between visits. They learn what to eat and how much, and I see their meals and sugar tests. It is free for doctors. Sign up here:\n${link}`;
  return (
    <section className="h-fit rounded-2xl border border-[#e3e9f1] bg-white p-5 sm:p-6">
      <div className="flex items-center gap-2">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand/10 text-brand">
          <UserPlus className="h-5 w-5" />
        </span>
        <h2 className="font-display text-lg font-bold text-ink">Invite a colleague</h2>
      </div>
      <p className="mt-2 text-sm text-ink-soft">
        Send this link to a doctor you know. When their first patient subscribes, you get{" "}
        <span className="font-semibold text-ink">{nairaFromKobo(COLLEAGUE_BONUS_KOBO)}</span>.
      </p>
      <p className="mt-4 break-all rounded-2xl bg-mist/70 px-4 py-3 text-sm font-semibold text-brand">{link}</p>
      <div className="mt-4 flex flex-wrap gap-2">
        <a
          href={`https://wa.me/?text=${encodeURIComponent(text)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-full bg-[#25D366] px-5 py-2.5 text-sm font-bold text-white hover:brightness-95"
        >
          <Send className="h-4 w-4" /> Send on WhatsApp
        </a>
        <button
          type="button"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(link);
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            } catch {
              /* nothing to do */
            }
          }}
          className="inline-flex items-center gap-2 rounded-full border border-line px-5 py-2.5 text-sm font-bold text-ink hover:border-brand"
        >
          <Copy className="h-4 w-4" /> {copied ? "Copied" : "Copy link"}
        </button>
      </div>
    </section>
  );
}
