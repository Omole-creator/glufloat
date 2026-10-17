"use client";

import TrendLine from "./TrendLine";

/** "3 Oct 2026" */
function weighDay(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

/**
 * Every weight the person has saved, as one line (founder, 2026-10-17), on
 * the report, in its PDF and on each patient's page for hospitals and
 * dietitians. The numbers only: never "good" or "bad", the same rule as
 * sugar tests. Weight goes wrong for reasons the app cannot see (lib/weightTrend.ts).
 */
export default function WeightTrend({ points, title = "Weight, every time it was saved" }: { points: { kg: number; at: string }[]; title?: string }) {
  if (points.length < 2) return null;
  const vals = points.map((p) => p.kg);
  return (
    <TrendLine
      points={points.map((p, i) => ({ id: `${p.at}-${i}`, at: p.at, value: p.kg }))}
      title={title}
      hint={`${points.length} weights, in kg. Tap a point to see it.`}
      tooltip={(p) => `${weighDay(p.at)}: ${p.value} kg`}
      axisLabel={weighDay}
      aria={`Line of ${points.length} weights, from ${Math.min(...vals)} to ${Math.max(...vals)} kg`}
      step={2}
    />
  );
}
