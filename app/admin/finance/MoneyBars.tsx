"use client";

import { useState } from "react";
import { naira, nairaShort } from "@/lib/financeConfig";

const REVENUE = "#1b5faa"; // brand blue
const SPEND = "#e08a2c"; // validated against the blue for colour-blind readers

/**
 * Money in against money out, one pair of bars per day, week or month. Both
 * are naira, so they share one axis. Hovering a pair shows both numbers and
 * what was left; the table under the chart carries every number as text too.
 */
export default function MoneyBars({
  points,
}: {
  points: { label: string; revenue: number; expenses: number }[];
}) {
  const [hover, setHover] = useState<number | null>(null);
  const top = Math.max(0, ...points.flatMap((p) => [p.revenue, p.expenses]));
  if (points.length === 0 || top === 0) {
    return <p className="py-12 text-center text-sm text-ink-soft">No money in or out in this period.</p>;
  }
  const h = (v: number) => (v ? `${Math.max(2, (v / top) * 100)}%` : "0");
  const shown = hover !== null ? points[hover] : null;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-4 text-ink-soft">
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm" style={{ background: REVENUE }} /> Revenue
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm" style={{ background: SPEND }} /> Expenses
          </span>
        </div>
        <span className="text-ink-soft" aria-live="polite">
          {shown ? (
            <>
              <span className="font-bold text-ink">{shown.label}</span>: {naira(shown.revenue)} in,{" "}
              {naira(shown.expenses)} out,{" "}
              <span className="font-bold text-ink">{naira(shown.revenue - shown.expenses)}</span> left
            </>
          ) : (
            <>Highest: <span className="font-bold text-ink">{nairaShort(top)}</span></>
          )}
        </span>
      </div>
      <div className="relative mt-3 flex h-44 items-end lg:h-64 gap-[3px] border-b border-[#e3e9f1]" onMouseLeave={() => setHover(null)}>
        {/* a faint line at half the highest value, so the height can be read */}
        <div className="pointer-events-none absolute inset-x-0 top-1/2 border-t border-dashed border-[#eef2f7]" />
        {points.map((p, i) => (
          <div
            key={i}
            className={`relative flex h-full flex-1 items-end justify-center gap-[2px] rounded-t-md ${hover === i ? "bg-[#f2f5f9]" : ""}`}
            onMouseEnter={() => setHover(i)}
            onFocus={() => setHover(i)}
            tabIndex={0}
            aria-label={`${p.label}: ${naira(p.revenue)} revenue, ${naira(p.expenses)} expenses`}
          >
            <div className="w-1/2 max-w-5 rounded-t-[4px]" style={{ height: h(p.revenue), background: REVENUE }} />
            <div className="w-1/2 max-w-5 rounded-t-[4px]" style={{ height: h(p.expenses), background: SPEND }} />
          </div>
        ))}
      </div>
      <div className="mt-1.5 flex justify-between text-[11px] text-ink-soft">
        <span>{points[0].label}</span>
        <span>{points[points.length - 1].label}</span>
      </div>
    </div>
  );
}
