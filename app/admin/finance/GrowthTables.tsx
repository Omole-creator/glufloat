"use client";

import { useState } from "react";
import { naira } from "@/lib/financeConfig";

export type GrowthLine = {
  label: string;
  partial: boolean;
  revenue: number;
  expenses: number;
  net: number;
  grossMargin: number | null;
  netMargin: number | null;
  /** A fraction against the row before, or null when there was nothing before. */
  growth: number | null;
};

const VIEWS = [
  { key: "month", label: "Month on month" },
  { key: "quarter", label: "Quarter on quarter" },
  { key: "year", label: "Year on year" },
] as const;
type View = (typeof VIEWS)[number]["key"];

const share = (x: number | null) => (x === null ? "—" : `${Math.round(x * 100)}%`);

/**
 * Every month, quarter and year since launch, each against the one before.
 * Newest first, because the question is always "how are we doing now". A row
 * still running says "so far" and is compared with the same number of days of
 * the row before it (see growthRows in lib/finance.ts).
 */
export default function GrowthTables({ data }: { data: Record<View, GrowthLine[]> }) {
  const [view, setView] = useState<View>("month");
  const rows = [...data[view]].reverse();
  const th = "px-5 py-3 text-[11px] font-bold uppercase tracking-[0.08em] text-ink/50 whitespace-nowrap";
  const td = "px-5 py-3 tabular-nums whitespace-nowrap";

  return (
    <div>
      <div className="px-5 sm:px-6">
        <div role="group" aria-label="Compare by" className="inline-flex rounded-xl bg-[#f2f5f9] p-1">
          {VIEWS.map((v) => (
            <button
              key={v.key}
              onClick={() => setView(v.key)}
              aria-pressed={view === v.key}
              className={`rounded-lg px-2.5 py-1.5 font-display text-xs font-bold transition-colors sm:px-3 sm:text-sm ${
                view === v.key ? "bg-white text-brand shadow-[0_1px_3px_rgba(12,42,71,0.15)]" : "text-ink-soft hover:text-ink"
              }`}
            >
              {v.label}
            </button>
          ))}
        </div>
      </div>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[44rem] text-left text-sm">
          <thead className="border-y border-[#e3e9f1] bg-[#f8fafc]">
            <tr>
              <th className={th}>{view === "month" ? "Month" : view === "quarter" ? "Quarter" : "Year"}</th>
              <th className={th}>Revenue</th>
              <th className={th}>Growth</th>
              <th className={th}>Expenses</th>
              <th className={th}>Profit or loss</th>
              <th className={th}>Gross margin</th>
              <th className={th}>Net margin</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.label} className="border-b border-[#eef2f7] last:border-0">
                <td className="px-5 py-3 font-semibold text-ink whitespace-nowrap">
                  {r.label}
                  {r.partial && <span className="ml-1.5 text-xs font-normal text-ink-soft">so far</span>}
                </td>
                <td className={`${td} text-ink`}>{naira(r.revenue)}</td>
                <td className={td}>
                  {r.growth === null ? (
                    <span className="text-ink-soft">—</span>
                  ) : (
                    <span className={r.growth >= 0 ? "font-bold text-leaf-deep" : "font-bold text-verdict-red"}>
                      {r.growth >= 0 ? "▲" : "▼"} {Math.abs(Math.round(r.growth * 100))}%
                    </span>
                  )}
                </td>
                <td className={`${td} text-ink-soft`}>{naira(r.expenses)}</td>
                <td className={`${td} font-semibold ${r.net < 0 ? "text-verdict-red" : "text-ink"}`}>{naira(r.net)}</td>
                <td className={`${td} text-ink-soft`}>{share(r.grossMargin)}</td>
                <td className={`${td} text-ink-soft`}>{share(r.netMargin)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
