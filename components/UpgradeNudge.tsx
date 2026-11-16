"use client";

import { useEffect, useState } from "react";
import { ArrowUpRight, X } from "lucide-react";
import { TIER_AMOUNTS, nairaLabel, type Tier } from "@/lib/pricing";
import { payWithCode, type CreatorState } from "@/lib/creatorClient";
import { localDayKey } from "@/lib/mealtime";

/**
 * One quiet upgrade line under the blue meal card (founder, 2026-11-16), at
 * the moment the better plan would help:
 *  - Basic:  "Want meals sized to your daily calorie target? Upgrade to Plus."
 *  - Plus:   "Chat with our dietitian on Premium."
 * Creator-brought members see it too, at their 20% off while it lasts.
 *
 * At most once a week: it shows on the first day it is seen in a week (all of
 * that day), then not again until next week. "Not now" hides it for the rest
 * of the week. Nothing for Premium, a trial, hospital or practice patients, or
 * a doctor's patient (they get their own Premium line).
 */
const KEY = "gf_upgrade_nudge";

/** Monday's date (local) of the week this day falls in, as YYYY-MM-DD. */
function weekOf(dayKey: string): string {
  const d = new Date(`${dayKey}T12:00:00`);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return d.toISOString().slice(0, 10);
}

export default function UpgradeNudge({
  tier,
  creator,
  withEmail,
  urls,
}: {
  tier: Tier;
  creator: CreatorState | null;
  withEmail: (url: string) => string;
  urls: Record<Tier, string>;
}) {
  const [show, setShow] = useState(false);
  const [err, setErr] = useState("");
  const next: Tier | null = tier === "basic" ? "plus" : tier === "plus" ? "dietitian" : null;

  useEffect(() => {
    if (!next) return;
    const today = localDayKey();
    const week = weekOf(today);
    let saved: { week?: string; day?: string; closed?: boolean } = {};
    try {
      saved = JSON.parse(localStorage.getItem(KEY) ?? "{}");
    } catch {
      /* no storage: show it, once per page */
    }
    if (saved.week === week && (saved.closed || saved.day !== today)) return;
    try {
      if (saved.week !== week) localStorage.setItem(KEY, JSON.stringify({ week, day: today }));
    } catch {
      /* nothing to do */
    }
    setShow(true);
  }, [next]);

  if (!next || !show) return null;

  const close = () => {
    setShow(false);
    try {
      localStorage.setItem(KEY, JSON.stringify({ week: weekOf(localDayKey()), day: localDayKey(), closed: true }));
    } catch {
      /* nothing to do */
    }
  };

  const discounted = creator?.prices?.[next] ?? null;
  const price = nairaLabel(discounted ?? TIER_AMOUNTS[next]);
  const words =
    next === "plus" ? "Want meals sized to your daily calorie target?" : "Want to chat with our dietitian?";
  const action = next === "plus" ? `Upgrade to Plus (${price} a month)` : `Chat with our dietitian on Premium (${price} a month)`;

  return (
    <div className="mt-3 flex items-start gap-3 rounded-2xl bg-white px-4 py-3 text-sm text-ink ring-1 ring-inset ring-line">
      <div className="min-w-0 flex-1">
        <p>{words}</p>
        {discounted ? (
          <button
            type="button"
            onClick={async () => {
              setErr("");
              const e = await payWithCode(next);
              if (e) setErr(e);
            }}
            className="mt-1 inline-flex items-center gap-1 font-semibold text-brand underline hover:text-brand-deep"
          >
            {action}, 20% off with your code <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
          </button>
        ) : (
          <a
            href={withEmail(urls[next])}
            className="mt-1 inline-flex items-center gap-1 font-semibold text-brand underline hover:text-brand-deep"
          >
            {action} <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
          </a>
        )}
        {err && <p className="mt-1 text-xs font-semibold text-verdict-red">{err}</p>}
      </div>
      <button type="button" onClick={close} aria-label="Not now" className="shrink-0 rounded-full p-1 text-ink-soft hover:bg-mist">
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
