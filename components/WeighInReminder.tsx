"use client";

import { useEffect, useState } from "react";
import { Scale, X } from "lucide-react";
import { readPersonalizationProfile } from "@/lib/personalizationProfile";
import { lastWeighIn, saveWeighIn, weighInDue, WEIGH_IN_EVERY_DAYS } from "@/lib/weighIn";
import { showToast } from "./Toast";

// Where the 30 days start for someone with a weight but no history row yet.
const SINCE_KEY = "gf_weigh_since";
// "Not today": the card stays away for a week.
const SNOOZE_KEY = "gf_weigh_snooze";
const SNOOZE_MS = 7 * 24 * 60 * 60 * 1000;

function readNum(key: string): number | null {
  try {
    const v = Number(localStorage.getItem(key));
    return Number.isFinite(v) && v > 0 ? v : null;
  } catch {
    return null;
  }
}

/**
 * Once a month, on the Today tab: "Step on a scale today and update your
 * weight info on GluFloat." (founder's words). Only for someone who has
 * already given a weight in My details. Saving updates the profile, so the
 * calorie target follows straight away (lib/weighIn.ts).
 */
export default function WeighInReminder() {
  const [show, setShow] = useState(false);
  const [lastKg, setLastKg] = useState<number | null>(null);
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState("");

  useEffect(() => {
    let alive = true;
    (async () => {
      const p = await readPersonalizationProfile();
      if (!p.weightKg) return;
      const snooze = readNum(SNOOZE_KEY);
      if (snooze && Date.now() - snooze < SNOOZE_MS) return;
      let last = await lastWeighIn();
      if (!last) {
        // No history row yet: start the month from the first time we see them.
        let since = readNum(SINCE_KEY);
        if (!since) {
          since = Date.now();
          try {
            localStorage.setItem(SINCE_KEY, String(since));
          } catch {
            /* storage blocked: it simply never comes due on this device */
          }
        }
        last = new Date(since).toISOString();
      }
      if (alive && weighInDue(last)) {
        setLastKg(p.weightKg);
        setShow(true);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  if (!show) return null;

  const notToday = () => {
    try {
      localStorage.setItem(SNOOZE_KEY, String(Date.now()));
    } catch {
      /* hides for this visit */
    }
    setShow(false);
  };

  const kg = Number(typed.replace(",", "."));
  const valid = typed.trim() !== "" && Number.isFinite(kg) && kg >= 20 && kg <= 300;
  const save = async () => {
    if (!valid) {
      setProblem("Type your weight in kg, like 72.");
      return;
    }
    setBusy(true);
    setProblem("");
    const ok = await saveWeighIn(Math.round(kg * 10) / 10);
    setBusy(false);
    if (!ok) {
      setProblem("This did not save. Check your internet and try again.");
      return;
    }
    showToast("Weight saved");
    setShow(false);
  };

  return (
    <section
      aria-label="Monthly weight check"
      className="relative rounded-3xl bg-white p-5 shadow-[0_8px_30px_-14px_rgba(12,42,71,0.3)] ring-1 ring-brand/20"
    >
      <button
        type="button"
        onClick={notToday}
        aria-label="Close the weight check"
        className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full text-ink-soft/60 transition-colors hover:bg-mist hover:text-ink"
      >
        <X className="h-4 w-4" />
      </button>
      <div className="flex items-start gap-3 pr-6">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-brand/10 text-brand">
          <Scale className="h-5 w-5" />
        </span>
        <div>
          <h2 className="font-display text-base font-bold leading-snug text-ink">
            Step on a scale today and update your weight info on GluFloat.
          </h2>
          {lastKg != null && (
            <p className="mt-1 text-sm text-ink-soft">
              Your last weight was {lastKg} kg. We check every {WEIGH_IN_EVERY_DAYS} days, so your daily food plan stays right for you.
            </p>
          )}
        </div>
      </div>

      <label htmlFor="gf-weigh-in" className="mt-4 block text-sm font-semibold text-ink">
        Your weight today (kg)
      </label>
      <input
        id="gf-weigh-in"
        value={typed}
        onChange={(e) => {
          setTyped(e.target.value);
          setProblem("");
        }}
        inputMode="decimal"
        autoComplete="off"
        className="mt-1.5 w-full rounded-2xl border-2 border-line bg-white px-4 py-3 text-lg font-semibold text-ink outline-none transition-colors focus:border-brand"
      />
      <p className="mt-2 text-xs text-ink-soft">No scale at home? Most pharmacies and clinics have one.</p>
      {problem && <p className="mt-2 text-sm font-semibold text-verdict-red">{problem}</p>}

      <div className="mt-4 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={save}
          disabled={busy || !valid}
          className="rounded-full bg-leaf px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-leaf-deep disabled:opacity-50"
        >
          {busy ? "Saving..." : "Save my weight"}
        </button>
        <button
          type="button"
          onClick={notToday}
          className="rounded-full border-2 border-line bg-white px-4 py-3 text-sm font-bold text-ink transition-colors hover:border-brand"
        >
          Not today
        </button>
      </div>
    </section>
  );
}
