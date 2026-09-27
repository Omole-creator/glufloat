"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
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

  // One toolbar: the window size as a segmented control, then which window,
  // on the same line. It wraps to a second line only on a narrow phone.
  const control =
    "h-9 rounded-lg border border-[#e3e9f1] bg-white px-2.5 text-sm font-semibold text-ink outline-none transition-colors hover:border-brand/40 focus:border-brand";
  const arrow =
    "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[#e3e9f1] bg-white text-ink transition-colors hover:border-brand/40 hover:text-brand";

  return (
    <div className="mt-5 flex flex-wrap items-center gap-2 rounded-2xl border border-[#e3e9f1] bg-white p-1.5 lg:flex-nowrap">
      {/* how big a window */}
      <div
        role="group"
        aria-label="How big a period"
        className="flex w-full rounded-xl bg-[#f2f5f9] p-1 sm:w-auto sm:shrink-0"
      >
        {GRAINS.map((g) => {
          const on = g.key === period.grain;
          return (
            <button
              key={g.key}
              onClick={() => setGrain(g.key)}
              aria-pressed={on}
              className={`flex-1 whitespace-nowrap rounded-lg px-1.5 py-1.5 font-display text-[13px] font-bold transition-colors sm:flex-none sm:px-3 sm:text-sm ${
                on ? "bg-white text-brand shadow-[0_1px_3px_rgba(12,42,71,0.15)]" : "text-ink-soft hover:text-ink"
              }`}
            >
              {g.label}
            </button>
          );
        })}
      </div>

      {/* which window */}
      {period.grain !== "all" && (
        <div className="flex min-w-0 items-center gap-1.5 lg:ml-auto">
          <button
            onClick={() => go(step(period, -1) as Record<string, string>)}
            className={arrow}
            aria-label="The period before this one"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>

          {(period.grain === "day" || period.grain === "week") && (
            <input
              type="date"
              value={period.d}
              onChange={(e) => go({ grain: period.grain, d: e.target.value })}
              className={control}
              aria-label="Pick a date"
            />
          )}

          {period.grain === "month" && (
            <select
              value={period.m}
              onChange={(e) => go({ grain: "month", y: String(period.y), m: e.target.value })}
              className={control}
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
              className={control}
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
              className={control}
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
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}
