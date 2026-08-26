"use client";

import { useEffect, useState } from "react";
import { Stethoscope } from "lucide-react";
import { getAssignedDietitian } from "@/lib/dietitianChat";

const GREETING = "Hi, I have diabetes and I would like some guidance.";

/**
 * The dietitian-tier WhatsApp door, same wa.me deep-link shape as
 * ChatWithFounder.tsx. Rendered ONLY when the caller has already confirmed
 * canUseDietitianChat(access) — see app/app/page.tsx. That gate is UX only;
 * the real entitlement check lives server-side in assign_dietitian(), which
 * this component calls and trusts to refuse anyone who has not actually paid
 * for the dietitian tier.
 */
export default function ChatWithDietitian() {
  const [href, setHref] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    getAssignedDietitian().then((d) => {
      if (alive && d) {
        setHref(`https://wa.me/${d.whatsappNumber}?text=${encodeURIComponent(GREETING)}`);
      }
    });
    return () => {
      alive = false;
    };
  }, []);

  if (!href) return null;

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-3 rounded-2xl bg-white p-4 shadow-[0_6px_28px_-14px_rgba(12,42,71,0.2)] ring-1 ring-brand/10 transition-all hover:-translate-y-0.5 hover:shadow-[0_10px_34px_-14px_rgba(12,42,71,0.26)]"
    >
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#25D366]/10 text-[#1DA851] ring-1 ring-inset ring-[#25D366]/20">
        <Stethoscope className="h-5 w-5" strokeWidth={2.2} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-display text-sm font-bold text-ink">
          Chat with your dietitian
        </span>
        <span className="block text-sm text-ink-soft">
          Opens WhatsApp, straight to your own dietitian
        </span>
      </span>
    </a>
  );
}
