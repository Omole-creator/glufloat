"use client";

import { type Reading, formatBoth, readingWhen } from "@/lib/glucose";
import { dayLabel, timeLabel } from "@/lib/mealResponse";
import TrendLine from "./TrendLine";

/**
 * Every sugar test as one line (components/TrendLine.tsx): on the report, the
 * last 3 months; on a patient's page for hospitals and dietitians, the last
 * 90 days. No target band and no colours on any number: GluFloat never
 * grades a sugar test (lib/glucose.ts).
 */
export default function SugarTrend({
  points,
  title = "Sugar tests, last 3 months",
  span = "in the last 3 months",
}: {
  points: Reading[];
  title?: string;
  span?: string;
}) {
  if (points.length < 2) return null;
  const vals = points.map((p) => p.mgdl);
  return (
    <TrendLine
      points={points.map((p) => ({ id: p.id, at: p.takenAt, value: p.mgdl }))}
      title={title}
      hint={`${points.length} tests, in mg/dL. Tap a point to see it.`}
      tooltip={(p) => `${dayLabel(p.at)}, ${timeLabel(p.at)}: ${formatBoth(p.value)}`}
      axisLabel={readingWhen}
      aria={`Line of ${points.length} sugar tests ${span}, from ${Math.round(Math.min(...vals))} to ${Math.round(Math.max(...vals))} mg/dL`}
      step={20}
    />
  );
}
