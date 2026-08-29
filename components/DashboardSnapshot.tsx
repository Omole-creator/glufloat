"use client";

import { useCallback, useEffect, useState } from "react";
import { Flame, Zap, CheckCircle2 } from "lucide-react";
import { caloriesEatenToday, monthStats, INTAKE_CHANGED, type MonthStats } from "@/lib/history";
import {
  readPersonalizationProfile,
  PERSONALIZATION_CHANGED,
} from "@/lib/personalizationProfile";
import { bmr, tdee, calorieTarget } from "@/lib/tdee";
import { suggestExtras, type ExtraSuggestion } from "@/lib/nextMeal";
import { localDayKey } from "@/lib/mealtime";
import ProgressRing from "@/components/ProgressRing";
import ExtraSuggestionCard from "@/components/ExtraSuggestionCard";

/**
 * The dashboard's "at a glance" row — three tiles, one shared visual
 * signature (ProgressRing, always the same brand blue-to-green sweep, never
 * a third colour): today's streak, calories remaining, and this month's good
 * meals. Replaces the old plain-text CalorieBudget card with something that
 * reads instantly, the way a real dashboard should, while never inventing a
 * number that was not already computed elsewhere (lib/history.ts's
 * monthStats, lib/tdee.ts's calorie math — this is a new VIEW on existing
 * data, not new data).
 *
 * The calorie tile only renders once sex/age/weight/height/activity are set
 * AND the tier allows it (`show`); the streak/month tiles are free on every
 * tier (a person's own count of their own meals) and only render once there
 * is something to say, so a first-time user is not shown a row of zeros.
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
      return;
    }
    const p = await readPersonalizationProfile();
    if (!p.sex || !p.ageYears || !p.weightKg || !p.heightCm || !p.activityLevel) {
      setCalTarget(null);
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
    setExtra(suggestExtras(left, localDayKey()));
  }, [show]);

  useEffect(() => {
    refresh();
    window.addEventListener(INTAKE_CHANGED, refresh);
    window.addEventListener(PERSONALIZATION_CHANGED, refresh);
    return () => {
      window.removeEventListener(INTAKE_CHANGED, refresh);
      window.removeEventListener(PERSONALIZATION_CHANGED, refresh);
    };
  }, [refresh]);

  const hasStreak = stats && stats.total > 0 && stats.streakDays >= 1;
  const hasMonth = stats && stats.total > 0;
  const hasCalories = calTarget != null && calRemaining != null;

  if (!hasStreak && !hasMonth && !hasCalories) return null;

  const tiles: {
    key: string;
    icon: typeof Flame;
    tone: "blue" | "green";
    eyebrow: string;
    percent: number;
    ringLabel: string;
    value: string;
    unit: string;
  }[] = [];

  if (hasStreak) {
    tiles.push({
      key: "streak",
      icon: Flame,
      tone: "green",
      eyebrow: "Streak",
      percent: (Math.min(stats!.streakDays, 7) / 7) * 100,
      ringLabel: `${Math.min(stats!.streakDays, 7)}/7`,
      value: `${stats!.streakDays}`,
      unit: stats!.streakDays === 1 ? "day in a row" : "days in a row",
    });
  }

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
      <div
        className={`grid gap-3 ${
          tiles.length === 3 ? "grid-cols-1 sm:grid-cols-3" : tiles.length === 2 ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1"
        }`}
      >
        {tiles.map((t) => {
          const Icon = t.icon;
          const tone = TONE[t.tone];
          return (
            <div
              key={t.key}
              className="rounded-2xl bg-white p-4 shadow-[0_6px_28px_-14px_rgba(12,42,71,0.2)] ring-1 ring-ink/[0.05]"
            >
              <div className="flex items-center gap-2">
                <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ring-1 ring-inset ${tone.chip}`}>
                  <Icon className="h-3.5 w-3.5" strokeWidth={2.4} />
                </span>
                <p className="text-xs font-semibold uppercase tracking-wide text-ink-soft">{t.eyebrow}</p>
              </div>
              <div className="mt-3 flex items-center gap-4">
                <ProgressRing percent={t.percent} size={72} stroke={7}>
                  <span className="font-display text-sm font-bold text-ink">{t.ringLabel}</span>
                </ProgressRing>
                <p className="font-display leading-tight text-ink">
                  <span className="text-3xl font-bold">{t.value}</span>{" "}
                  <span className="text-sm font-semibold text-ink-soft">{t.unit}</span>
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
