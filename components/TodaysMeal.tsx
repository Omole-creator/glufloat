"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { RefreshCw, ArrowRight, Sunrise, Sun, Moon, Check } from "lucide-react";
import {
  currentMeal,
  localDayKey,
  type NamedMeal,
} from "@/lib/mealtime";
import { planForDay, type MealIdea } from "@/lib/nextMeal";
import { loggedFoodCounts } from "@/lib/history";
import { trackUsage } from "@/lib/usage";
import type { Food } from "@/lib/types";

const MEAL_ICON = {
  breakfast: Sunrise,
  lunch: Sun,
  dinner: Moon,
} as const;

// Remember, per meal, which plates were shown on which days, so the next day's
// plate is never one of the last few. Lives on the device (localStorage).
const SHOWN_KEY = "gf_meal_shown";
const REMEMBER_DAYS = 3;
type Shown = { day: string; index: number };
type ShownMap = Record<string, Shown[]>;

function readShown(meal: string): Shown[] {
  try {
    const all = JSON.parse(localStorage.getItem(SHOWN_KEY) || "{}") as ShownMap;
    const v = all[meal];
    // An older version of this stored a single object, not a list.
    if (Array.isArray(v)) return v;
    if (v && typeof v === "object") return [v as Shown];
    return [];
  } catch {
    return [];
  }
}

function writeShown(meal: string, day: string, index: number): void {
  try {
    const all = JSON.parse(localStorage.getItem(SHOWN_KEY) || "{}") as ShownMap;
    const list = readShown(meal).filter((s) => s.day !== day);
    list.push({ day, index });
    all[meal] = list.slice(-REMEMBER_DAYS);
    localStorage.setItem(SHOWN_KEY, JSON.stringify(all));
  } catch {
    /* ignore */
  }
}

/** The plates shown on the days BEFORE this one, which today must not repeat. */
function toAvoid(meal: string, today: string): number[] {
  return readShown(meal)
    .filter((s) => s.day !== today)
    .map((s) => s.index);
}

/** Join clean food names into one plain line: "A, B and C". */
function line(names: string[]): string {
  if (names.length <= 1) return names[0] ?? "";
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

const HEADING = {
  breakfast: "Today's breakfast",
  lunch: "Today's lunch",
  dinner: "Today's dinner",
} as const;

/**
 * The first thing on the /app home, and the reason somebody opened it: the app
 * telling them what to eat, as an authority. It is not collapsed and it is not
 * one card among four — search, build and the doctor's report sit UNDER it as
 * escape routes.
 *
 * It is stable through a meal, changes at the next meal, changes again the next
 * day, and leans away from what the person already eats a lot (see planForDay).
 * Names are kept plain here, so a card never reads "Titus / Mackerel / Tilapia";
 * the full detail is on the food's own card in the builder.
 */
export default function TodaysMeal({ onBuild }: { onBuild: (foods: Food[]) => void }) {
  const [meal, setMeal] = useState<NamedMeal | null>(null);
  const [idea, setIdea] = useState<MealIdea | null>(null);
  const [offset, setOffset] = useState(0);
  const [counts, setCounts] = useState<Map<string, number>>(new Map());
  const [dayKey, setDayKey] = useState("");
  // Kept in refs as well so the clock timer below can read the latest values
  // without being torn down and rebuilt on every change.
  const countsRef = useRef<Map<string, number>>(new Map());
  const nowRef = useRef<{ meal: NamedMeal | null; day: string }>({
    meal: null,
    day: "",
  });

  const plan = useCallback((m: NamedMeal, dk: string, c: Map<string, number>) => {
    const next = planForDay(m, dk, c, 0, toAvoid(m, dk));
    setIdea(next);
    setOffset(0);
    writeShown(m, dk, next.index);
  }, []);

  useEffect(() => {
    const m = currentMeal();
    const dk = localDayKey();
    nowRef.current = { meal: m, day: dk };
    setMeal(m);
    setDayKey(dk);
    plan(m, dk, new Map());
    loggedFoodCounts().then((c) => {
      countsRef.current = c;
      setCounts(c);
      plan(m, dk, c);
    });
  }, [plan]);

  /**
   * The meal must follow the clock, not the page load. A phone left open on the
   * app at 11:55 used to still be showing breakfast at half past twelve. Check
   * every minute, and re-plan the moment the meal or the Nigerian day changes.
   */
  useEffect(() => {
    const id = setInterval(() => {
      const m = currentMeal();
      const dk = localDayKey();
      const was = nowRef.current;
      if (was.meal === null || (m === was.meal && dk === was.day)) return;
      nowRef.current = { meal: m, day: dk };
      setMeal(m);
      setDayKey(dk);
      plan(m, dk, countsRef.current);
    }, 60_000);
    return () => clearInterval(id);
  }, [plan]);

  if (!meal || !idea || idea.foods.length === 0) return null;

  const Icon = MEAL_ICON[meal];
  const another = () => {
    void trackUsage("meal_reroll");
    const n = offset + 1;
    setOffset(n);
    const next = planForDay(meal, dayKey, counts, n, toAvoid(meal, dayKey));
    setIdea(next);
    writeShown(meal, dayKey, next.index);
  };

  return (
    /* Brand blue, the same canvas as the landing hero, because this card IS the
       hero of /app: it is the answer the person opened the app for, and a white
       card among white cards did not say so. Green is spent on the one action,
       exactly as it is on the landing page. */
    <section className="relative isolate overflow-hidden rounded-3xl bg-gradient-to-b from-[#0d3568] via-[#14538f] to-[#1b5faa] shadow-[0_18px_50px_-18px_rgba(12,42,71,0.55)]">
      <div
        className="dots-light pointer-events-none absolute inset-x-0 top-0 h-40 opacity-40"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-white/10 blur-3xl"
        aria-hidden
      />
      <div className="relative px-5 py-6 sm:px-7 sm:py-7">
        <div className="flex items-center gap-3.5">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/15 text-white ring-1 ring-inset ring-white/25">
            <Icon className="h-6 w-6" strokeWidth={2.2} />
          </span>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-white/55">
              Today&apos;s food
            </p>
            <p className="font-display text-xl font-bold leading-tight text-white">
              {HEADING[meal]}
            </p>
          </div>
        </div>

        <p className="mt-5 font-display text-3xl font-bold leading-snug text-white sm:text-4xl">
          {line(idea.names)}
        </p>

        <span className="mt-4 inline-flex items-center gap-2 rounded-full bg-white/15 px-3.5 py-1.5 text-sm font-semibold text-white ring-1 ring-inset ring-white/20">
          <Check className="h-4 w-4 text-verdict-green" strokeWidth={3} /> Good to eat
          <span className="text-white/40">·</span> Picked for you
        </span>

        <div className="mt-6 flex flex-wrap gap-2.5">
          <button
            onClick={() => {
              void trackUsage("check_this_meal");
              onBuild(idea.foods);
            }}
            className="flex items-center gap-2 rounded-full bg-leaf px-6 py-3.5 text-sm font-bold text-white shadow-[0_10px_24px_-8px_rgba(62,155,79,0.75)] transition-all hover:-translate-y-0.5 hover:bg-leaf-deep"
          >
            View details <ArrowRight className="h-4 w-4" />
          </button>
          <button
            onClick={another}
            className="flex items-center gap-2 rounded-full bg-white/10 px-5 py-3.5 text-sm font-bold text-white ring-1 ring-inset ring-white/25 transition-colors hover:bg-white/20"
          >
            <RefreshCw className="h-4 w-4" /> Try another meal
          </button>
        </div>
      </div>
    </section>
  );
}
