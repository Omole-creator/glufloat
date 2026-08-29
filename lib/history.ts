"use client";

import { createClient } from "@/lib/supabase/client";
import type { Reading } from "./glucose";
import type { Verdict } from "./types";
import { FOODS } from "./search";

/**
 * A person's own food-check history, saved to their account (meal_checks table,
 * see supabase/meal-history-schema.sql). This is what lets the app remember
 * someone: recent meals, a day-streak, and the "what I ate this month" answer.
 *
 * Everything here is fire-and-forget or best-effort read. A failed history write
 * must NEVER stop a person seeing their food answer, so every call is wrapped and
 * a failure just means one row is not saved.
 */

export type CheckKind = "single" | "meal";

/**
 * Fired whenever the eaten-log changes, so anything reading it back (the
 * how-often warning) can refresh without a page reload.
 */
export const INTAKE_CHANGED = "glufloat:intake-changed";

export function notifyIntakeChanged(): void {
  try {
    window.dispatchEvent(new Event(INTAKE_CHANGED));
  } catch {
    /* no window (server) or blocked; nothing depends on it */
  }
}

export interface MealCheck {
  id: number;
  kind: CheckKind;
  label: string;
  verdict: Verdict;
  checkedAt: string; // ISO
}

/**
 * A logged meal with the blood sugar readings that hang off it
 * (glucose_readings, see lib/glucose.ts).
 *
 * A separate type on purpose. Most reads here do not want readings and should
 * not pretend to: an empty `readings` on a row that never fetched them would be
 * indistinguishable from a meal nobody tested after, and that difference is the
 * whole point of the doctor report.
 */
export interface CheckedMeal extends MealCheck {
  readings: Reading[];
}

/**
 * Save one check and return its new row id (or null on any failure). `user_id`
 * fills itself from the session (a column default of auth.uid()), so we only send
 * the food and the colour. Not awaited by the UI.
 *
 * The id is returned so the meal builder can delete the earlier, half-built row
 * when a fuller version of the same meal is saved (see MealBuilder), collapsing a
 * building session into one row instead of one per food added.
 */
export async function saveCheck(
  kind: CheckKind,
  label: string,
  verdict: Verdict,
): Promise<number | null> {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null; // signed out; nothing to save against
    const { data } = await supabase
      .from("meal_checks")
      .insert({ kind, label, verdict })
      .select("id")
      .single();
    // What a person has eaten has just changed, and the how-often warning is
    // read from it. Without this, someone who logs a fast-sugar food and then
    // checks a second one in the same sitting is told nothing until they
    // reload, which is exactly the moment the warning is for.
    notifyIntakeChanged();
    return (data?.id as number) ?? null;
  } catch {
    /* never break the app over a log write */
    return null;
  }
}

/** Remove a check by id (used to collapse a half-built meal into its final row). */
export async function deleteCheck(id: number): Promise<void> {
  try {
    await createClient().from("meal_checks").delete().eq("id", id);
  } catch {
    /* best effort */
  }
}

/** The most recent checks, newest first. Empty on any failure. */
export async function recentChecks(limit = 8): Promise<MealCheck[]> {
  try {
    const supabase = createClient();
    const { data } = await supabase
      .from("meal_checks")
      .select("id,kind,label,verdict,checked_at")
      .order("checked_at", { ascending: false })
      .limit(limit);
    return (data ?? []).map((r) => ({
      id: r.id as number,
      kind: r.kind as CheckKind,
      label: r.label as string,
      verdict: r.verdict as Verdict,
      checkedAt: r.checked_at as string,
    }));
  } catch {
    return [];
  }
}

/**
 * Every check from the current calendar month, newest first, each one carrying
 * whatever blood sugar readings the person attached to it. This is the raw
 * material for the "what I ate this month" record a person shows their doctor.
 *
 * The readings come back in the SAME query, through the foreign key, so the
 * report is still one round trip. Only this read joins them: the counting reads
 * below keep their narrow column lists, because a streak and a food count do not
 * care about a number and should not pay to fetch it.
 */
export async function monthChecks(): Promise<CheckedMeal[]> {
  const now = new Date();
  return checkedSince(new Date(now.getFullYear(), now.getMonth(), 1));
}

/**
 * The same rows over a wider window, for the recall and pattern lines on a food
 * card. Those need more than a calendar month: on the 2nd of the month, one month
 * of history is two days, and the card would go quiet for everybody at the start
 * of every month.
 */
export async function checkedMeals(days = 90): Promise<CheckedMeal[]> {
  const since = new Date();
  since.setDate(since.getDate() - days);
  return checkedSince(since);
}

async function checkedSince(since: Date): Promise<CheckedMeal[]> {
  const from = since.toISOString();
  const shape = (rows: unknown[]): CheckedMeal[] =>
    rows.map((r) => {
      const row = r as Record<string, unknown>;
      return {
        id: row.id as number,
        kind: row.kind as CheckKind,
        label: row.label as string,
        verdict: row.verdict as Verdict,
        checkedAt: row.checked_at as string,
        readings: readingsOf(row.glucose_readings),
      };
    });
  try {
    const supabase = createClient();
    // The joined form first. Note the select string cannot be a variable: the
    // Supabase types parse it as a literal, and a variable fails to type check.
    const joined = await supabase
      .from("meal_checks")
      .select(
        "id,kind,label,verdict,checked_at,glucose_readings(id,meal_check_id,value_raw,unit,mgdl,taken_at)",
      )
      .gte("checked_at", from)
      .order("checked_at", { ascending: false });
    if (!joined.error) return shape(joined.data ?? []);

    // Then the plain one. A push IS a release here, so the code can reach a
    // database where glucose-schema.sql has not been run yet: the join above
    // would fail, and without this fallback the doctor report would tell
    // everybody with months of history that they have saved no meals. Losing the
    // readings for a few minutes is fine. Losing the record is not.
    const plain = await supabase
      .from("meal_checks")
      .select("id,kind,label,verdict,checked_at")
      .gte("checked_at", from)
      .order("checked_at", { ascending: false });
    return plain.error ? [] : shape(plain.data ?? []);
  } catch {
    return [];
  }
}

/** The joined reading rows, oldest first so "last time" really is the last one. */
function readingsOf(joined: unknown): Reading[] {
  if (!Array.isArray(joined)) return [];
  return joined
    .map((r) => ({
      id: r.id as number,
      mealCheckId: (r.meal_check_id as number | null) ?? null,
      valueRaw: Number(r.value_raw),
      unit: r.unit as Reading["unit"],
      mgdl: Number(r.mgdl),
      takenAt: r.taken_at as string,
    }))
    .sort((a, b) => a.takenAt.localeCompare(b.takenAt));
}

/**
 * How many times each food has been logged in the last 30 days (single checks,
 * and each food inside a saved meal). The daily meal card uses this to lean AWAY
 * from what someone already eats a lot, so the suggestion brings variety instead
 * of handing back their usual plate.
 */
export async function loggedFoodCounts(): Promise<Map<string, number>> {
  return foodCounts();
}

/**
 * The same count, but only over meals the app marked GREEN.
 *
 * These are the foods a person eats AND that are good for them, so the daily
 * meal can lean gently towards them. It is a small nudge on top of the variety
 * rule, never a replacement for it: the plate must still change every day.
 */
export async function likedFoodCounts(): Promise<Map<string, number>> {
  return foodCounts("green");
}

async function foodCounts(verdict?: Verdict): Promise<Map<string, number>> {
  const counts = new Map<string, number>();
  try {
    const supabase = createClient();
    const since = new Date();
    since.setDate(since.getDate() - 30);
    let q = supabase
      .from("meal_checks")
      .select("kind,label")
      .gte("checked_at", since.toISOString());
    if (verdict) q = q.eq("verdict", verdict);
    const { data } = await q;
    for (const r of data ?? []) {
      const names =
        r.kind === "single"
          ? [r.label as string]
          : String(r.label)
              .split(",")
              .map((s) => s.trim());
      for (const n of names) {
        if (n) counts.set(n, (counts.get(n) ?? 0) + 1);
      }
    }
  } catch {
    /* empty map on failure */
  }
  return counts;
}

/** A date shifted into Nigerian time (WAT, GMT+1), same helper as lib/intake.ts,
 *  so "today" agrees with the rest of the app's meal-time/day logic. */
function wat(ms: number): Date {
  return new Date(ms + 60 * 60 * 1000);
}
function watDayKey(d: Date): string {
  return `${d.getUTCFullYear()}-${d.getUTCMonth()}-${d.getUTCDate()}`;
}

const foodCalories = new Map(FOODS.map((f) => [f.name, f.calories ?? 0]));

/**
 * Calories eaten today (Nigerian time), summed from the same saved "I ate
 * this" log everything else here reads — a lookup is not a meal eaten, so
 * this only ever counts what was actually logged, never a search or a
 * suggestion. Splits a meal's comma-joined label the same way
 * lib/mealSize.ts's sizedFoods() does. A food logged before the calorie data
 * existed, or one the log can no longer match by name, simply contributes 0
 * rather than breaking the total.
 */
export async function caloriesEatenToday(): Promise<number> {
  try {
    const supabase = createClient();
    const todayK = watDayKey(wat(Date.now()));
    // 48h of buffer (not 24h) so "today" in WAT is always fully covered
    // regardless of the reader's own clock/timezone.
    const since = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
    const { data } = await supabase
      .from("meal_checks")
      .select("kind,label,checked_at")
      .gte("checked_at", since);
    let total = 0;
    for (const r of data ?? []) {
      const when = new Date(r.checked_at as string).getTime();
      if (watDayKey(wat(when)) !== todayK) continue;
      const names =
        r.kind === "single"
          ? [r.label as string]
          : String(r.label)
              .split(",")
              .map((s) => s.trim());
      for (const n of names) total += foodCalories.get(n) ?? 0;
    }
    return Math.round(total);
  } catch {
    return 0;
  }
}

export interface MonthStats {
  total: number; // checks this calendar month
  green: number;
  yellow: number;
  red: number;
  distinctFoods: number;
  streakDays: number; // days in a row up to today with at least one check
  /** The food checked most often in the last 7 days (2 or more times), if any. */
  topRepeat: { label: string; count: number } | null;
  /** Last calendar month, so the app can show a person they are improving. */
  prevTotal: number;
  prevGreen: number;
}

/** A local-day key (YYYY-MM-DD in the browser's own timezone). */
function dayKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * This-month totals, LAST month's totals, and the current day-streak. One query
 * pulls the last ~70 days and everything is worked out on the device, so the
 * streak follows the person's own local days (a check just before midnight
 * counts for that day).
 *
 * 70 days, not 60: on the last day of a long month, the first day of the month
 * before it is 61 days back, and last month has to be WHOLE for the comparison
 * line to be honest.
 */
export async function monthStats(): Promise<MonthStats> {
  const empty: MonthStats = {
    total: 0,
    green: 0,
    yellow: 0,
    red: 0,
    distinctFoods: 0,
    streakDays: 0,
    topRepeat: null,
    prevTotal: 0,
    prevGreen: 0,
  };
  try {
    const supabase = createClient();
    const since = new Date();
    since.setDate(since.getDate() - 70);
    const { data } = await supabase
      .from("meal_checks")
      .select("kind,label,verdict,checked_at")
      .gte("checked_at", since.toISOString())
      .order("checked_at", { ascending: false });

    const rows = data ?? [];
    if (rows.length === 0) return empty;

    const now = new Date();
    const monthY = now.getFullYear();
    const monthM = now.getMonth();
    // The month before this one, which may be in the previous year.
    const prev = new Date(monthY, monthM - 1, 1);
    const prevY = prev.getFullYear();
    const prevM = prev.getMonth();

    const stats = { ...empty };
    const monthFoods = new Set<string>();
    const dayHits = new Set<string>();
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const weekSingleCounts = new Map<string, number>();

    for (const r of rows) {
      const when = new Date(r.checked_at as string);
      dayHits.add(dayKey(when));

      if (when.getFullYear() === monthY && when.getMonth() === monthM) {
        stats.total += 1;
        if (r.verdict === "green") stats.green += 1;
        else if (r.verdict === "yellow") stats.yellow += 1;
        else if (r.verdict === "red") stats.red += 1;
        monthFoods.add((r.label as string).toLowerCase());
      } else if (when.getFullYear() === prevY && when.getMonth() === prevM) {
        stats.prevTotal += 1;
        if (r.verdict === "green") stats.prevGreen += 1;
      }

      if (r.kind === "single" && when >= weekAgo) {
        const key = r.label as string;
        weekSingleCounts.set(key, (weekSingleCounts.get(key) ?? 0) + 1);
      }
    }
    stats.distinctFoods = monthFoods.size;

    // Day-streak. Start today; if today has no check yet, start from yesterday so
    // a live streak is not reported as broken just because they have not eaten.
    const cursor = new Date();
    cursor.setHours(0, 0, 0, 0);
    if (!dayHits.has(dayKey(cursor))) cursor.setDate(cursor.getDate() - 1);
    while (dayHits.has(dayKey(cursor))) {
      stats.streakDays += 1;
      cursor.setDate(cursor.getDate() - 1);
    }

    // Most-repeated single food this week (2+ times).
    let top: { label: string; count: number } | null = null;
    for (const [label, count] of weekSingleCounts) {
      if (count >= 2 && (!top || count > top.count)) top = { label, count };
    }
    stats.topRepeat = top;

    return stats;
  } catch {
    return empty;
  }
}
