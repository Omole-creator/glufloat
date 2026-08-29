"use client";

import type { ReactNode } from "react";

/**
 * A small circular progress ring — the one repeated visual signature across
 * the dashboard's stat tiles (streak, calories, month), always in the brand
 * blue-to-green sweep, never a third colour. Deliberately plain SVG, no
 * animation library: the value itself is what should draw the eye, not the
 * ring drawing itself in.
 */
export default function ProgressRing({
  percent,
  size = 64,
  stroke = 7,
  children,
}: {
  /** 0-100. Values outside that range are clamped. */
  percent: number;
  size?: number;
  stroke?: number;
  children?: ReactNode;
}) {
  // Math.max/min propagate NaN rather than clamp it away (Math.min(100, NaN)
  // is NaN, not 100), which would draw a broken/invisible arc — fall back to
  // an empty ring rather than a division producing a NaN SVG attribute.
  const clamped = Number.isFinite(percent) ? Math.max(0, Math.min(100, percent)) : 0;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - clamped / 100);
  const gradientId = "gf-ring-gradient";

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="var(--blue)" />
            <stop offset="100%" stopColor="var(--green)" />
          </linearGradient>
        </defs>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--mist)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={`url(#${gradientId})`}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-[stroke-dashoffset] duration-500 ease-out"
        />
      </svg>
      {children && (
        <div className="absolute inset-0 flex items-center justify-center">{children}</div>
      )}
    </div>
  );
}
