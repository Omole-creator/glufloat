"use client";

import { createClient } from "@/lib/supabase/client";
import type { Verdict } from "./types";

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

export interface MealCheck {
  id: number;
  kind: CheckKind;
  label: string;
  verdict: Verdict;
  checkedAt: string; // ISO
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
 * Every check from the current calendar month, newest first. This is the raw
 * material for the "what I ate this month" record a person shows their doctor.
 */
export async function monthChecks(): Promise<MealCheck[]> {
  try {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const supabase = createClient();
    const { data } = await supabase
      .from("meal_checks")
      .select("id,kind,label,verdict,checked_at")
      .gte("checked_at", monthStart.toISOString())
      .order("checked_at", { ascending: false });
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
 * How many times each food has been logged in the last 30 days (single checks,
 * and each food inside a saved meal). The daily meal card uses this to lean AWAY
 * from what someone already eats a lot, so the suggestion brings variety instead
 * of handing back their usual plate.
 */
export async function loggedFoodCounts(): Promise<Map<string, number>> {
  const counts = new Map<string, number>();
  try {
    const supabase = createClient();
    const since = new Date();
    since.setDate(since.getDate() - 30);
    const { data } = await supabase
      .from("meal_checks")
      .select("kind,label")
      .gte("checked_at", since.toISOString());
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

export interface MonthStats {
  total: number; // checks this calendar month
  green: number;
  yellow: number;
  red: number;
  distinctFoods: number;
  streakDays: number; // days in a row up to today with at least one check
  /** The food checked most often in the last 7 days (2 or more times), if any. */
  topRepeat: { label: string; count: number } | null;
}

/** A local-day key (YYYY-MM-DD in the browser's own timezone). */
function dayKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * This-month totals and the current day-streak. One query pulls the last ~60
 * days and everything is worked out on the device, so the streak follows the
 * person's own local days (a check just before midnight counts for that day).
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
  };
  try {
    const supabase = createClient();
    const since = new Date();
    since.setDate(since.getDate() - 60);
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
