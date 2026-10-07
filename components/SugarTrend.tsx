"use client";

import { useEffect, useRef, useState } from "react";
import { type Reading, formatBoth, readingWhen } from "@/lib/glucose";
import { dayLabel, timeLabel } from "@/lib/mealResponse";

/**
 * Every sugar test this month as one line, for the doctor's report.
 *
 * One series, one colour (the brand blue), one axis. Deliberately NO target band,
 * no shading and no red/green zones: drawing a "normal range" would be grading
 * the person's blood sugar, which the app never does (lib/glucose.ts). The
 * numbers are shown; the doctor reads them. Tap or hover a point for its value.
 */
export default function SugarTrend({ points }: { points: Reading[] }) {
  const [hover, setHover] = useState<number | null>(null);
  // Drawn at the real pixel width, so the labels stay one size on a phone and
  // on a laptop instead of growing with the box.
  const box = useRef<HTMLDivElement>(null);
  const [W, setW] = useState(320);
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setW(Math.max(240, Math.round(el.clientWidth))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  if (points.length < 2) return null;

  const H = 170;
  const pad = { l: 34, r: 12, t: 12, b: 24 };
  const times = points.map((p) => new Date(p.takenAt).getTime());
  const t0 = Math.min(...times);
  const t1 = Math.max(...times);
  const vals = points.map((p) => p.mgdl);
  const lo = Math.floor((Math.min(...vals) - 10) / 20) * 20;
  const hi = Math.ceil((Math.max(...vals) + 10) / 20) * 20;
  const x = (t: number) => pad.l + ((t - t0) / Math.max(1, t1 - t0)) * (W - pad.l - pad.r);
  const y = (v: number) => pad.t + (1 - (v - lo) / Math.max(1, hi - lo)) * (H - pad.t - pad.b);
  const ticks = [lo, Math.round((lo + hi) / 2), hi];
  const path = points.map((p, i) => `${i === 0 ? "M" : "L"}${x(times[i]).toFixed(1)},${y(p.mgdl).toFixed(1)}`).join(" ");
  const shown = hover !== null ? points[hover] : null;

  return (
    <div ref={box}>
      <p className="font-display text-sm font-bold text-brand">Your sugar tests this month</p>
      <p className="min-h-[1.25rem] text-xs text-ink-soft" aria-live="polite">
        {shown
          ? `${dayLabel(shown.takenAt)}, ${timeLabel(shown.takenAt)}: ${formatBoth(shown.mgdl)}`
          : `${points.length} tests, in mg/dL. Tap a point to see it.`}
      </p>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        width={W}
        height={H}
        className="mt-1 block max-w-full"
        role="img"
        aria-label={`Line of your ${points.length} sugar tests this month, from ${Math.round(Math.min(...vals))} to ${Math.round(Math.max(...vals))} mg/dL`}
        onMouseLeave={() => setHover(null)}
      >
        {ticks.map((v) => (
          <g key={v}>
            <line x1={pad.l} x2={W - pad.r} y1={y(v)} y2={y(v)} stroke="var(--line, #e3e9f0)" strokeWidth={1} />
            <text x={pad.l - 6} y={y(v) + 4} textAnchor="end" fontSize="11" fill="var(--ink-soft)">
              {v}
            </text>
          </g>
        ))}
        <text x={pad.l} y={H - 6} fontSize="11" fill="var(--ink-soft)">
          {readingWhen(points[0].takenAt)}
        </text>
        <text x={W - pad.r} y={H - 6} fontSize="11" textAnchor="end" fill="var(--ink-soft)">
          {readingWhen(points[points.length - 1].takenAt)}
        </text>
        <path d={path} fill="none" stroke="var(--blue)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
        {points.map((p, i) => (
          <g key={p.id}>
            <circle
              cx={x(times[i])}
              cy={y(p.mgdl)}
              r={hover === i ? 5 : 4}
              fill="var(--blue)"
              stroke="white"
              strokeWidth={2}
            />
            {/* A hit target bigger than the dot, so a finger can find it. */}
            <circle
              cx={x(times[i])}
              cy={y(p.mgdl)}
              r={12}
              fill="transparent"
              onMouseEnter={() => setHover(i)}
              onClick={() => setHover(i)}
            >
              <title>{`${dayLabel(p.takenAt)}, ${timeLabel(p.takenAt)}: ${formatBoth(p.mgdl)}`}</title>
            </circle>
          </g>
        ))}
      </svg>
    </div>
  );
}
