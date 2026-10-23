"use client";

import { useEffect, useState } from "react";
import { Pill, ArrowRight } from "lucide-react";
import { readPersonalizationProfile, PERSONALIZATION_CHANGED } from "@/lib/personalizationProfile";

// "Ask me later": the line stays away for a week.
const SNOOZE_KEY = "gf_med_name_snooze";
const SNOOZE_MS = 7 * 24 * 60 * 60 * 1000;

function snoozed(): boolean {
  try {
    const v = Number(localStorage.getItem(SNOOZE_KEY));
    return Number.isFinite(v) && v > 0 && Date.now() - v < SNOOZE_MS;
  } catch {
    return false;
  }
}

/**
 * For someone who answered "I don't know the name" of their diabetes
 * medicine (co-founder dietitian, 2026-10-23, Q3): the app plans carefully
 * while it does not know, and asks them, calmly, to look at the packet. Gone
 * for good once a name is picked in My details.
 */
export default function MedicineNamePrompt({ onOpenDetails }: { onOpenDetails: () => void }) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const check = () =>
      readPersonalizationProfile().then((p) => setShow(p.medTypes.includes("unknown") && !snoozed()));
    check();
    window.addEventListener(PERSONALIZATION_CHANGED, check);
    return () => window.removeEventListener(PERSONALIZATION_CHANGED, check);
  }, []);

  if (!show) return null;

  const later = () => {
    try {
      localStorage.setItem(SNOOZE_KEY, String(Date.now()));
    } catch {
      /* hides for this visit */
    }
    setShow(false);
  };

  return (
    <section
      aria-label="Your medicine's name"
      className="rounded-3xl bg-white p-5 shadow-[0_8px_30px_-14px_rgba(12,42,71,0.3)] ring-1 ring-brand/20"
    >
      <div className="flex items-start gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-brand/10 text-brand">
          <Pill className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <h2 className="font-display text-base font-bold leading-snug text-ink">
            Do you know the name of your diabetes medicine?
          </h2>
          <p className="mt-1 text-sm text-ink-soft">Look at the packet and add it in My details.</p>
          <div className="mt-4 flex flex-wrap gap-2.5">
            <button
              type="button"
              onClick={onOpenDetails}
              className="flex items-center gap-2 rounded-full bg-brand px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-brand-deep"
            >
              Add it in My details <ArrowRight className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={later}
              className="rounded-full px-4 py-3 text-sm font-semibold text-ink-soft ring-1 ring-inset ring-line transition-colors hover:bg-mist hover:text-ink"
            >
              Ask me later
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
