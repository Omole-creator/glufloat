"use client";

import { useCallback, useEffect, useState } from "react";
import { ClipboardList, Droplet, Target, TrendingUp, X } from "lucide-react";
import { preferredUnit } from "@/lib/glucose";
import { READINGS_CHANGED, recentReadings } from "@/lib/glucoseLog";
import { averageLine, readingsByFood } from "@/lib/glucosePattern";
import { checkedMeals, loggedFoodCounts } from "@/lib/history";
import { cleanFoodName } from "@/lib/foodName";

/** Foods this device has already been nudged about. */
const KEY = "gf_strip_nudge";
/** The month this device was last shown its own average. */
const AVG_KEY = "gf_avg_shown";
/** Whether this device has already closed the "you have never tested" nudge. */
const NEVER_TESTED_KEY = "gf_never_tested_dismissed";
/** Times eaten before a food is worth spending a strip on. Once is not a habit. */
const MIN_TIMES = 2;

function seen(): string[] {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

function remember(name: string): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(Array.from(new Set([...seen(), name]))));
  } catch {
    /* storage blocked; it will simply come round again */
  }
}

/** The Nigerian calendar month, so "once a month" means their month. */
function monthKey(): string {
  const wat = new Date(Date.now() + 60 * 60 * 1000);
  return `${wat.getUTCFullYear()}-${wat.getUTCMonth()}`;
}

/**
 * One quiet strip under the sugar test button, showing whichever of two things
 * is worth saying. Never both, and never a card: it must not compete with the
 * meal answer above it.
 *
 * 1. THEIR OWN AVERAGE, when it is high. This is the more important of the two,
 *    so it wins. It exists because a person who is consistently high is invisible
 *    to everything else the app does: `dangerLine` only fires above 300 and they
 *    may never cross it, and the pattern line compares them with their own usual,
 *    which for them IS high. Said at most ONCE A MONTH (`gf_avg_shown`), because
 *    it is a serious sentence and repeating it weekly would make it furniture.
 *
 * 2. WHERE TO SPEND THE NEXT STRIP. Strips cost real money, so somebody here may
 *    only test once or twice a week. Every other app treats that as the user
 *    failing to log. It is the opposite: the app knows what they eat a lot and
 *    which of those it has never seen a test for, so it can point the one strip
 *    they can afford at the gap. Shown only once they have saved a test, and only
 *    for a food eaten twice or more.
 */
export default function ReadingNudge({
  onOpenReport,
}: {
  onOpenReport?: () => void;
}) {
  const [avg, setAvg] = useState<{ text: string } | null>(null);
  const [food, setFood] = useState<{ name: string; times: number } | null>(null);
  const [neverTested, setNeverTested] = useState(false);

  const load = useCallback(() => {
    void Promise.all([
      loggedFoodCounts(),
      checkedMeals(),
      recentReadings(),
    ]).then(([counts, checks, readings]) => {
      if (readings.length === 0) {
        setAvg(null);
        setFood(null);
        try {
          setNeverTested(localStorage.getItem(NEVER_TESTED_KEY) !== "1");
        } catch {
          setNeverTested(true);
        }
        return;
      }
      setNeverTested(false);

      // Their own average, at most once a month.
      let shownThisMonth = false;
      try {
        shownThisMonth = localStorage.getItem(AVG_KEY) === monthKey();
      } catch {
        /* storage blocked: show it, rather than lose a serious line */
      }
      const line = shownThisMonth
        ? null
        : averageLine(readings, preferredUnit(readings));
      if (line) {
        setAvg({ text: line.text });
        setFood(null);
        return;
      }
      setAvg(null);

      // Otherwise, the food they eat most that has never been measured.
      const tested = readingsByFood(checks);
      const already = seen();
      let best: { name: string; times: number } | null = null;
      for (const [name, times] of counts) {
        if (times < MIN_TIMES) continue;
        if (tested.has(name)) continue;
        if (already.includes(name)) continue;
        if (!best || times > best.times) best = { name, times };
      }
      setFood(best);
    });
  }, []);

  useEffect(() => {
    load();
    window.addEventListener(READINGS_CHANGED, load);
    return () => window.removeEventListener(READINGS_CHANGED, load);
  }, [load]);

  if (avg) {
    const dismiss = () => {
      try {
        localStorage.setItem(AVG_KEY, monthKey());
      } catch {
        /* it will show again; better than losing it */
      }
      setAvg(null);
      load();
    };
    return (
      <div className="relative rounded-2xl bg-white px-4 py-3.5 pr-9 shadow-[0_4px_20px_-12px_rgba(12,42,71,0.2)] ring-1 ring-ink/[0.04]">
        <p className="flex items-start gap-2 text-sm text-ink">
          <TrendingUp className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
          <span className="font-semibold">{avg.text}</span>
        </p>
        {/* The report is the lever: it is the thing they hand the doctor. */}
        {onOpenReport && (
          <button
            onClick={() => {
              onOpenReport();
              dismiss();
            }}
            className="ml-6 mt-2.5 inline-flex items-center gap-1.5 rounded-full border-2 border-brand/30 bg-white px-4 py-1.5 text-xs font-bold text-brand transition-colors hover:border-brand hover:bg-brand/5"
          >
            <ClipboardList className="h-3.5 w-3.5" />
            Open my doctor&apos;s report
          </button>
        )}
        <button
          onClick={dismiss}
          aria-label="Hide my average for this month"
          className="absolute right-2.5 top-2.5 text-ink-soft/50 transition-colors hover:text-ink"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    );
  }

  if (!food) {
    if (!neverTested) return null;
    const dismissNeverTested = () => {
      try {
        localStorage.setItem(NEVER_TESTED_KEY, "1");
      } catch {
        /* it will show again; better than losing it */
      }
      setNeverTested(false);
    };
    return (
      <div className="relative rounded-2xl bg-white px-4 py-3.5 pr-9 shadow-[0_4px_20px_-12px_rgba(12,42,71,0.2)] ring-1 ring-ink/[0.04]">
        <p className="flex items-start gap-2 text-sm text-ink">
          <Droplet className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
          <span>
            You have not tested your sugar yet. Even one test helps. Tap{" "}
            <strong className="font-semibold">&quot;I tested my sugar&quot;</strong> above,
            any time you check it.
          </span>
        </p>
        <button
          onClick={dismissNeverTested}
          aria-label="Hide this note about testing my sugar"
          className="absolute right-2.5 top-2.5 text-ink-soft/50 transition-colors hover:text-ink"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    );
  }

  const shown = cleanFoodName(food.name);

  const dismissFood = () => {
    remember(food.name);
    setFood(null);
  };

  return (
    <div className="relative rounded-2xl bg-white px-4 py-3.5 pr-9 shadow-[0_4px_20px_-12px_rgba(12,42,71,0.2)] ring-1 ring-ink/[0.04]">
      <p className="flex items-start gap-2 text-sm text-ink">
        <Target className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
        <span>
          You have eaten <strong className="font-semibold">{shown}</strong>{" "}
          {food.times} times in the last month, and we have never seen a sugar
          test after it. Next time you test your sugar, do it after {shown}.
        </span>
      </p>
      <button
        onClick={dismissFood}
        aria-label={`Stop asking me to test my sugar after ${shown}`}
        className="absolute right-2.5 top-2.5 text-ink-soft/50 transition-colors hover:text-ink"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
