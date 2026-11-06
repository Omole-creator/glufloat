"use client";

import { useEffect, useState } from "react";
import { ShieldAlert } from "lucide-react";
import { PERSONALIZATION_CHANGED, readPersonalizationProfile, saveNutAllergies } from "@/lib/personalizationProfile";
import { NUT_NONE } from "@/lib/nutAllergy";

// "Ask me later": the question stays away for a week.
const SNOOZE_KEY = "gf_nut_snooze";
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
 * For somebody who has not answered the nut question yet (founder, 2026-11-06).
 * The blue card can hold groundnut for anybody, on any plan, so this is asked of
 * everyone, once. "Yes" goes to My details, where they pick which nuts.
 */
export default function NutAllergyPrompt({ onOpenDetails }: { onOpenDetails: () => void }) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const check = () => readPersonalizationProfile().then((p) => setShow(p.nutAllergies === null && !snoozed()));
    check();
    window.addEventListener(PERSONALIZATION_CHANGED, check);
    return () => window.removeEventListener(PERSONALIZATION_CHANGED, check);
  }, []);

  if (!show) return null;

  const later = () => {
    try {
      localStorage.setItem(SNOOZE_KEY, String(Date.now()));
    } catch {
      /* it comes back next visit */
    }
    setShow(false);
  };

  return (
    <div className="rounded-3xl bg-white p-5 shadow-[0_14px_34px_-22px_rgba(12,42,71,0.4)] ring-1 ring-line">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand/10 text-brand">
          <ShieldAlert className="h-5 w-5" strokeWidth={2.2} aria-hidden />
        </span>
        <div className="min-w-0">
          <p className="font-display text-base font-bold text-ink">Has eating any nut ever made your body react?</p>
          <p className="mt-1 text-sm leading-relaxed text-ink-soft">
            For example itching, swelling of the lips or face, a rash, vomiting, or trouble breathing.
          </p>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={onOpenDetails}
          className="rounded-full bg-brand px-4 py-2.5 text-sm font-bold text-white hover:bg-brand-deep"
        >
          Yes, or not sure
        </button>
        <button
          type="button"
          onClick={async () => {
            await saveNutAllergies([NUT_NONE]);
            setShow(false);
          }}
          className="rounded-full border border-line px-4 py-2.5 text-sm font-bold text-ink hover:bg-mist"
        >
          No
        </button>
      </div>
      <button type="button" onClick={later} className="mt-2 w-full py-1 text-xs font-semibold text-ink-soft">
        Ask me later
      </button>
    </div>
  );
}
