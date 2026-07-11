"use client";

import { useRouter, useSearchParams } from "next/navigation";
import {
  GRAINS,
  MONTH_NAMES,
  selectableYears,
  step,
  type Grain,
  type Period,
} from "@/lib/period";

/**
 * Pick any period, not just the one we happen to be in.
 *
 * Choose the size (day, week, month, quarter, year) and then WHICH one. June
 * 2027 is a choice, not "30 days ago". The arrows step one period at a time and
 * cross year boundaries properly, so you can walk back through the months.
 *
 * The choice lives in the URL, so the view can be bookmarked and sent to
 * somebody. `basePath` keeps whatever other params that page uses (for example
 * the open partner on the partner dashboard).
 */
export default function PeriodPicker({
  period,
  basePath,
  keep = [],
}: {
  period: Period;
  basePath: string;
  /** Query params on this page that must survive a period change. */
  keep?: string[];
}) {
  const router = useRouter();
  const sp = useSearchParams();

  function go(next: Record<string, string | undefined>) {
    const q = new URLSearchParams();
    for (const k of keep) {
      const v = sp.get(k);
      if (v) q.set(k, v);
    }
    for (const [k, v] of Object.entries(next)) if (v) q.set(k, v);
    router.push(`${basePath}?${q}`);
  }

  /** Change the size of the window, keeping where we are pointing. */
  function setGrain(grain: Grain) {
    go({
      grain,
      y: String(period.y),
      m: String(period.m),
      q: String(period.q),
      d: period.d,
    });
  }

  const chip = (on: boolean) =>
    `rounded-full px-4 py-1.5 text-sm font-display font-bold transition-colors ${
      on
        ? "bg-brand text-white"
        : "border border-line bg-white text-ink hover:border-brand"
    }`;

  const select =
    "rounded-xl border-2 border-line bg-white px-3 py-1.5 text-sm font-semibold text-ink outline-none focus:border-brand";

  const arrow =
    "rounded-full border border-line bg-white px-3 py-1.5 font-display font-bold text-ink hover:border-brand disabled:opacity-30";

  return (
    <div className="mt-6 space-y-3">
      {/* how big a window */}
      <div className="flex flex-wrap items-center gap-2">
        {GRAINS.map((g) => (
          <button key={g.key} onClick={() => setGrain(g.key)} className={chip(g.key === period.grain)}>
            {g.label}
          </button>
        ))}
      </div>

      {/* which window */}
      {period.grain !== "all" && (
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => go(step(period, -1) as Record<string, string>)}
            className={arrow}
            aria-label="The period before this one"
          >
            &lsaquo;
          </button>

          {(period.grain === "day" || period.grain === "week") && (
            <input
              type="date"
              value={period.d}
              onChange={(e) => go({ grain: period.grain, d: e.target.value })}
              className={select}
              aria-label="Pick a date"
            />
          )}

          {period.grain === "month" && (
            <select
              value={period.m}
              onChange={(e) => go({ grain: "month", y: String(period.y), m: e.target.value })}
              className={select}
              aria-label="Pick a month"
            >
              {MONTH_NAMES.map((name, i) => (
                <option key={name} value={i + 1}>{name}</option>
              ))}
            </select>
          )}

          {period.grain === "quarter" && (
            <select
              value={period.q}
              onChange={(e) => go({ grain: "quarter", y: String(period.y), q: e.target.value })}
              className={select}
              aria-label="Pick a quarter"
            >
              {[1, 2, 3, 4].map((q) => (
                <option key={q} value={q}>
                  Q{q} ({MONTH_NAMES[(q - 1) * 3].slice(0, 3)} to {MONTH_NAMES[q * 3 - 1].slice(0, 3)})
                </option>
              ))}
            </select>
          )}

          {period.grain !== "day" && period.grain !== "week" && (
            <select
              value={period.y}
              onChange={(e) =>
                go({
                  grain: period.grain,
                  y: e.target.value,
                  m: String(period.m),
                  q: String(period.q),
                })
              }
              className={select}
              aria-label="Pick a year"
            >
              {selectableYears().map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          )}

          <button
            onClick={() => go(step(period, 1) as Record<string, string>)}
            className={arrow}
            aria-label="The period after this one"
          >
            &rsaquo;
          </button>

          {/* Say plainly which window you are looking at. */}
          <span className="ml-1 rounded-full bg-mist px-4 py-1.5 font-display text-sm font-bold text-ink">
            {period.label}
          </span>
        </div>
      )}
    </div>
  );
}
