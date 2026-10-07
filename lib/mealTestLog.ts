"use client";

import type { ParsedReading, Reading } from "./glucose";
import { checkedMeals, saveCheck, type CheckKind, type CheckedMeal } from "./history";
import { linkReadingToMeal, recentReadings, saveReading } from "./glucoseLog";
import { beforeToLink, mealTestFor, type MealTest } from "./mealResponse";
import { trackUsage } from "./usage";
import type { Verdict } from "./types";

/**
 * Starting a meal test and finding the one waiting for its 2-hour check.
 *
 * The rules live in lib/mealResponse.ts (pure). This file only talks to the
 * database and to the device, and like lib/history.ts every call is best-effort:
 * a failed write must never stop somebody eating their lunch.
 */

/**
 * Started meals, remembered on the device as well as in meal_checks.started_at.
 * Belt and braces: until meal-response-schema.sql has been run, the database
 * cannot hold the start, and without it a meal tested with no before-test would
 * never get its 2-hour check.
 */
const STARTED_KEY = "gf_meal_tests";
/** Meal tests the person closed ("I will not test this time", or "Done"). */
const CLOSED_KEY = "gf_meal_tests_closed";
const KEEP = 12;

type Started = { id: number; startedAt: string };

function readList<T>(key: string): T[] {
  try {
    const raw = localStorage.getItem(key);
    const v = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(v) ? (v as T[]) : [];
  } catch {
    return [];
  }
}

function writeList<T>(key: string, list: T[]): void {
  try {
    localStorage.setItem(key, JSON.stringify(list.slice(-KEEP)));
  } catch {
    /* storage blocked: the database copy still works once migrated */
  }
}

function rememberStarted(id: number, startedAt: string): void {
  writeList<Started>(STARTED_KEY, [...readList<Started>(STARTED_KEY).filter((s) => s.id !== id), { id, startedAt }]);
}

/** Close a meal test so its card stops showing. */
export function closeMealTest(id: number): void {
  writeList<number>(CLOSED_KEY, [...readList<number>(CLOSED_KEY).filter((x) => x !== id), id]);
}

function isClosed(id: number): boolean {
  return readList<number>(CLOSED_KEY).includes(id);
}

export interface StartedMeal {
  id: number;
  startedAt: string;
  /** The before-meal test now on this meal, whether typed here or linked. */
  beforeMgdl: number | null;
}

/**
 * "Start my meal": log the meal with its start time and, if there is one, the
 * sugar test before it. A before-test the person already saved in the last hour
 * from the sugar test box is tied to the meal instead of asking for a new one.
 * Returns null if the meal itself could not be saved.
 */
export async function startMealTest(args: {
  kind: CheckKind;
  label: string;
  verdict: Verdict;
  foodIds: string[];
  sizes: string[];
  calories?: number;
  before: ParsedReading | null;
}): Promise<StartedMeal | null> {
  const startedAt = new Date().toISOString();
  const id = await saveCheck(args.kind, args.label, args.verdict, args.calories, {
    foodIds: args.foodIds,
    sizes: args.sizes,
    startedAt,
  });
  if (id === null) return null;
  rememberStarted(id, startedAt);
  void trackUsage("meal_test_started");

  let beforeMgdl: number | null = null;
  if (args.before) {
    const saved = await saveReading(args.before.valueRaw, args.before.unit, args.before.mgdl, id, "before_meal");
    beforeMgdl = saved ? saved.mgdl : null;
  } else {
    const loose = (await recentReadings()).filter((r) => r.mealCheckId === null);
    const link = beforeToLink(loose, startedAt);
    if (link && (await linkReadingToMeal(link.id, id))) beforeMgdl = link.mgdl;
  }
  if (beforeMgdl === null) void trackUsage("meal_test_no_before");
  return { id, startedAt, beforeMgdl };
}

/** A before-meal test saved in the last hour and not yet on any meal, if any. */
export async function pendingBeforeTest(): Promise<{ mgdl: number; takenAt: string } | null> {
  const loose = (await recentReadings()).filter((r) => r.mealCheckId === null);
  const r = beforeToLink(loose, new Date().toISOString());
  return r ? { mgdl: r.mgdl, takenAt: r.takenAt } : null;
}

/** Save the 2-hour test on a started meal. Returns the saved test, or null. */
export async function saveAfterTest(mealId: number, parsed: ParsedReading): Promise<Reading | null> {
  const saved = await saveReading(parsed.valueRaw, parsed.unit, parsed.mgdl, mealId, "after_meal");
  if (saved) void trackUsage("meal_test_completed");
  return saved;
}

export interface ActiveMealTest {
  meal: CheckedMeal;
  test: MealTest;
}

/** Long enough to see the result after saving it; short enough to be gone tomorrow. */
const SHOW_FOR_MS = 12 * 60 * 60 * 1000;

/**
 * The meal test to show on the home screen, if any: the newest started meal in
 * the last 12 hours that the person has not closed. It is either waiting for
 * its 2-hour check, due now, or done (and showing its result). A started meal
 * whose 4-hour window ran out with no second test is not shown at all.
 */
export async function activeMealTest(): Promise<ActiveMealTest | null> {
  const started = new Map(readList<Started>(STARTED_KEY).map((s) => [s.id, s.startedAt]));
  const now = Date.now();
  const meals = await checkedMeals(1);
  for (const meal of meals) {
    const startedAt = meal.startedAt ?? started.get(meal.id) ?? null;
    if (!startedAt) continue;
    if (now - new Date(startedAt).getTime() > SHOW_FOR_MS) continue;
    if (isClosed(meal.id)) continue;
    const test = mealTestFor({
      id: meal.id,
      kind: meal.kind,
      label: meal.label,
      checkedAt: meal.checkedAt,
      startedAt,
      before: meal.beforeReadings,
      after: meal.readings,
    });
    return { meal: { ...meal, startedAt }, test };
  }
  return null;
}
