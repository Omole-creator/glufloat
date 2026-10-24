"use client";

import { useEffect, useState } from "react";
import { Zap, CheckCircle2 } from "lucide-react";
import { monthStats, INTAKE_CHANGED, type MonthStats } from "@/lib/history";
import { useTodaysCalories } from "@/lib/useTodaysCalories";

/**
 * The dashboard's "at a glance" row — sits directly ABOVE `TodaysMeal`
 * (founder instruction, 2026-08-29), so a person sees the day's scoreboard
 * before the day's answer. Two tiles, one shared visual signature
 * (ProgressRing, always the same brand blue-to-green sweep, never a third
 * colour): calories remaining today, and this month's good meals. **The
 * streak tile was removed 2026-08-29** (founder instruction) — a person's
 * streak still lives on in `HabitStreak`'s own milestone line, this row is
 * just no longer where it is repeated. Never invents a number that was not
 * already computed elsewhere (lib/history.ts's monthStats, lib/tdee.ts's
 * calorie math via `useTodaysCalories` — this is a VIEW on existing data,
 * not new data). **The green extras card no longer lives here** — it moved
 * to its own `TodaysExtras` component, rendered directly under `TodaysMeal`
 * (2026-08-30 instruction), not bundled under this tile row.
 *
 * The calorie tile only renders once sex/age/weight/height/activity are set
 * AND the tier allows it (`show`); the month tile is free on every tier (a
 * person's own count of their own meals) and only renders once there is
 * something to say, so a first-time user is not shown a row of zeros.
 */
export default function DashboardSnapshot({ show }: { show: boolean }) {
  const [stats, setStats] = useState<MonthStats | null>(null);
  const { target: calTarget, remaining: calRemaining, overPlan } = useTodaysCalories(show);

  useEffect(() => {
    const refreshMonth = () => monthStats().then(setStats);
    refreshMonth();
    window.addEventListener(INTAKE_CHANGED, refreshMonth);
    return () => window.removeEventListener(INTAKE_CHANGED, refreshMonth);
  }, []);

  const hasMonth = stats && stats.total > 0;
  const hasCalories = calTarget != null && calRemaining != null;

  if (!hasMonth && !hasCalories) return null;

  const tiles: {
    key: string;
    icon: typeof Zap;
    tone: "blue" | "green";
    eyebrow: string;
    percent: number;
    ringLabel: string;
    value: string;
    unit: string;
  }[] = [];

  if (hasCalories) {
    // After a bigger meal earlier today the meals left keep their normal size
    // (co-founder dietitian, 2026-10-23), so the tile shows what is still
    // planned, which agrees with the meal card, and never an "over" number.
    const done = overPlan && calRemaining === 0;
    const eatenShare = done
      ? 100
      : calTarget! > 0
        ? Math.max(0, ((calTarget! - calRemaining!) / calTarget!) * 100)
        : 0;
    tiles.push({
      key: "calories",
      icon: Zap,
      tone: "blue",
      eyebrow: done ? "Calories today" : overPlan ? "Still planned" : "Calories left today",
      percent: eatenShare,
      ringLabel: `${Math.round(eatenShare)}%`,
      value: done ? "Done" : `${calRemaining}`,
      unit: done ? "for today" : "kcal",
    });
  }

  if (hasMonth) {
    const share = stats!.total > 0 ? (stats!.green / stats!.total) * 100 : 0;
    tiles.push({
      key: "month",
      icon: CheckCircle2,
      tone: "green",
      eyebrow: "This month",
      percent: share,
      ringLabel: `${Math.round(share)}%`,
      value: `${stats!.green}`,
      unit: stats!.green === 1 ? "good meal" : "good meals",
    });
  }

  const TONE = {
    blue: { chip: "bg-brand/10 text-brand ring-brand/15" },
    green: { chip: "bg-leaf/10 text-leaf-deep ring-leaf/15" },
  } as const;

  return (
    // Always horizontal, even on a phone (founder instruction) — with just 2
    // tiles left after removing the streak, there is room to keep them side
    // by side at every width rather than stacking.
    <div className={`grid gap-3 ${tiles.length === 2 ? "grid-cols-2" : "grid-cols-1"}`}>
      {tiles.map((t) => {
        const Icon = t.icon;
        const tone = TONE[t.tone];
        return (
          <div
            key={t.key}
            className="min-w-0 rounded-3xl bg-white p-4 shadow-[0_10px_34px_-18px_rgba(12,42,71,0.3)] ring-1 ring-ink/[0.05]"
          >
            <div className="flex items-center gap-2">
              <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ring-1 ring-inset ${tone.chip}`}>
                <Icon className="h-3.5 w-3.5" strokeWidth={2.4} />
              </span>
              <p className="truncate text-[11px] font-bold uppercase tracking-wide text-ink-soft sm:text-xs">
                {t.eyebrow}
              </p>
            </div>
            <p className="mt-3 min-w-0 font-display leading-none text-ink">
              <span className="text-3xl font-bold sm:text-4xl">{t.value}</span>{" "}
              <span className="text-sm font-semibold text-ink-soft">{t.unit}</span>
            </p>
            {/* A bar, not a ring (2026-10-25): a "0%" in a circle next to the
                number read as a second, different number. */}
            <div className="mt-3 flex items-center gap-2.5">
              <span className="h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-mist">
                <span
                  className="block h-full rounded-full bg-gradient-to-r from-brand to-leaf transition-[width] duration-700"
                  style={{ width: `${Number.isFinite(t.percent) ? Math.max(0, Math.min(100, t.percent)) : 0}%` }}
                />
              </span>
              <span className="shrink-0 text-xs font-bold text-ink-soft">{t.ringLabel}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
