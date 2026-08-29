"use client";

import { useCallback, useEffect, useState } from "react";
import { Zap, CheckCircle2 } from "lucide-react";
import { caloriesEatenToday, monthStats, INTAKE_CHANGED, type MonthStats } from "@/lib/history";
import {
  readPersonalizationProfile,
  PERSONALIZATION_CHANGED,
} from "@/lib/personalizationProfile";
import { bmr, tdee, calorieTarget } from "@/lib/tdee";
import { suggestExtras, type ExtraSuggestion } from "@/lib/nextMeal";
import { localDayKey, currentMeal } from "@/lib/mealtime";
import ProgressRing from "@/components/ProgressRing";
import ExtraSuggestionCard from "@/components/ExtraSuggestionCard";

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
 * calorie math — this is a VIEW on existing data, not new data).
 *
 * The calorie tile only renders once sex/age/weight/height/activity are set
 * AND the tier allows it (`show`); the month tile is free on every tier (a
 * person's own count of their own meals) and only renders once there is
 * something to say, so a first-time user is not shown a row of zeros.
 */
export default function DashboardSnapshot({ show }: { show: boolean }) {
  const [stats, setStats] = useState<MonthStats | null>(null);
  const [calTarget, setCalTarget] = useState<number | null>(null);
  const [calRemaining, setCalRemaining] = useState<number | null>(null);
  const [extra, setExtra] = useState<ExtraSuggestion | null>(null);

  const refresh = useCallback(async () => {
    monthStats().then(setStats);
    if (!show) {
      setCalTarget(null);
      setExtra(null);
      return;
    }
    const p = await readPersonalizationProfile();
    if (!p.sex || !p.ageYears || !p.weightKg || !p.heightCm || !p.activityLevel) {
      setCalTarget(null);
      setExtra(null);
      return;
    }
    const dailyTarget = calorieTarget(
      tdee(bmr(p.sex, p.weightKg, p.heightCm, p.ageYears), p.activityLevel),
      p.goals,
    );
    const eatenToday = await caloriesEatenToday();
    const left = Math.max(0, dailyTarget - eatenToday);
    setCalTarget(dailyTarget);
    setCalRemaining(left);
    // Extras only ever show at breakfast or lunch, never dinner (founder
    // instruction: by the end of dinner the day's target must already be
    // met through the 3 meals themselves plus whatever extras were eaten
    // earlier — dinner is not another round of "still hungry, eat more").
    setExtra(currentMeal() === "dinner" ? null : suggestExtras(left, localDayKey()));
  }, [show]);

  useEffect(() => {
    refresh();
    window.addEventListener(INTAKE_CHANGED, refresh);
    window.addEventListener(PERSONALIZATION_CHANGED, refresh);
    // Follows the clock, same reasoning as TodaysMeal: a phone left open
    // across the breakfast/lunch → dinner boundary must stop offering
    // extras without needing a reload or a fresh log/save event.
    const id = setInterval(refresh, 60_000);
    return () => {
      window.removeEventListener(INTAKE_CHANGED, refresh);
      window.removeEventListener(PERSONALIZATION_CHANGED, refresh);
      clearInterval(id);
    };
  }, [refresh]);

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
    const eatenShare = calTarget! > 0 ? ((calTarget! - calRemaining!) / calTarget!) * 100 : 0;
    tiles.push({
      key: "calories",
      icon: Zap,
      tone: "blue",
      eyebrow: "Calories left today",
      percent: eatenShare,
      ringLabel: `${Math.round(eatenShare)}%`,
      value: `${calRemaining}`,
      unit: "kcal",
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
    <div className="space-y-3">
      {/* Always horizontal, even on a phone (founder instruction) — with just
          2 tiles left after removing the streak, there is room to keep them
          side by side at every width rather than stacking. */}
      <div className={`grid gap-3 ${tiles.length === 2 ? "grid-cols-2" : "grid-cols-1"}`}>
        {tiles.map((t) => {
          const Icon = t.icon;
          const tone = TONE[t.tone];
          return (
            <div
              key={t.key}
              className="min-w-0 rounded-2xl bg-white p-3 shadow-[0_6px_28px_-14px_rgba(12,42,71,0.2)] ring-1 ring-ink/[0.05] sm:p-4"
            >
              <div className="flex items-center gap-1.5">
                <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-lg ring-1 ring-inset ${tone.chip}`}>
                  <Icon className="h-3 w-3" strokeWidth={2.4} />
                </span>
                <p className="truncate text-[10.5px] font-semibold uppercase tracking-wide text-ink-soft sm:text-xs">
                  {t.eyebrow}
                </p>
              </div>
              <div className="mt-2.5 flex items-center gap-2.5 sm:gap-4">
                <ProgressRing percent={t.percent} size={56} stroke={6}>
                  <span className="font-display text-xs font-bold text-ink">{t.ringLabel}</span>
                </ProgressRing>
                <p className="min-w-0 font-display leading-tight text-ink">
                  <span className="text-2xl font-bold sm:text-3xl">{t.value}</span>{" "}
                  <span className="text-xs font-semibold text-ink-soft sm:text-sm">{t.unit}</span>
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {extra && <ExtraSuggestionCard extra={extra} />}
    </div>
  );
}
