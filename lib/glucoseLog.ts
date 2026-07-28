"use client";

import { createClient } from "@/lib/supabase/client";
import type { Reading } from "./glucose";

/**
 * Saving and reading back a person's own blood sugar readings
 * (glucose_readings, see supabase/glucose-schema.sql).
 *
 * Same shape as lib/history.ts, on purpose: every call is best-effort and
 * try/catch-swallowed, because a failed write must never stop somebody using the
 * app. The rules about units and wording are next door in lib/glucose.ts, which
 * stays pure so the test can run it with no server.
 */

/**
 * Fired whenever the readings change, so a card already on screen can refresh
 * without a reload. Same idea as INTAKE_CHANGED in lib/history.ts, and for the
 * same reason: somebody who logs a reading and then looks up the food they just
 * ate should see their own number on the card straight away.
 */
export const READINGS_CHANGED = "glufloat:readings-changed";

export function notifyReadingsChanged(): void {
  try {
    window.dispatchEvent(new Event(READINGS_CHANGED));
  } catch {
    /* no window (server) or blocked; nothing depends on it */
  }
}

/**
 * "Add your reading" on a meal in the doctor report, asking the reading box up
 * the page to open with that meal already chosen.
 *
 * An event rather than a prop threaded through app/app/page.tsx, matching how
 * INTAKE_CHANGED already crosses the same gap. The meal is carried whole, because
 * the box only ever fetches the last few meals and this one may be older than
 * that.
 */
export const ADD_READING_FOR = "glufloat:add-reading-for";

export interface AskedMeal {
  id: number;
  label: string;
  checkedAt: string;
}

export function askForReading(meal: AskedMeal): void {
  try {
    window.dispatchEvent(new CustomEvent(ADD_READING_FOR, { detail: meal }));
  } catch {
    /* no window; the reading box is simply not opened for them */
  }
}

/** Turn one database row into a Reading. */
function row(r: Record<string, unknown>): Reading {
  return {
    id: r.id as number,
    mealCheckId: (r.meal_check_id as number | null) ?? null,
    valueRaw: Number(r.value_raw),
    unit: r.unit as Reading["unit"],
    mgdl: Number(r.mgdl),
    takenAt: r.taken_at as string,
  };
}

/**
 * Save one reading, and return it (or null on any failure).
 *
 * `mealCheckId` may be null, and often is. A fasting number and a reading taken
 * at no particular time are both real, and most of what somebody who tests twice
 * a week actually has. Refusing them would lock out the very people this is for.
 */
export async function saveReading(
  valueRaw: number,
  unit: Reading["unit"],
  mgdl: number,
  mealCheckId: number | null,
): Promise<Reading | null> {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null; // signed out; nothing to save against
    const { data } = await supabase
      .from("glucose_readings")
      .insert({
        value_raw: valueRaw,
        unit,
        mgdl,
        meal_check_id: mealCheckId,
      })
      .select("id,meal_check_id,value_raw,unit,mgdl,taken_at")
      .single();
    if (!data) return null;
    notifyReadingsChanged();
    return row(data as Record<string, unknown>);
  } catch {
    return null;
  }
}

/** Remove one reading. */
export async function deleteReading(id: number): Promise<void> {
  try {
    await createClient().from("glucose_readings").delete().eq("id", id);
    notifyReadingsChanged();
  } catch {
    /* best effort */
  }
}

/**
 * Every reading from the last 90 days, newest first.
 *
 * Wider than the doctor report's calendar month on purpose: the "usual" number
 * the pattern line compares against, and the recall line on a food card, both
 * want more history than one month. The report does its own month filtering.
 */
export async function recentReadings(): Promise<Reading[]> {
  try {
    const since = new Date();
    since.setDate(since.getDate() - 90);
    const { data } = await createClient()
      .from("glucose_readings")
      .select("id,meal_check_id,value_raw,unit,mgdl,taken_at")
      .gte("taken_at", since.toISOString())
      .order("taken_at", { ascending: false });
    return (data ?? []).map((r) => row(r as Record<string, unknown>));
  } catch {
    return [];
  }
}

/**
 * The readings from this calendar month that belong to no meal, oldest first.
 *
 * The doctor report walks a person's meals, so a reading with no meal would
 * simply not be on it. That would quietly punish the exact person this feature
 * was shaped around: somebody who tests first thing in the morning, or at no
 * particular time, and has nothing to attach it to. Their numbers go on the
 * report too, in a block of their own.
 */
export async function looseMonthReadings(): Promise<Reading[]> {
  try {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const { data } = await createClient()
      .from("glucose_readings")
      .select("id,meal_check_id,value_raw,unit,mgdl,taken_at")
      .is("meal_check_id", null)
      .gte("taken_at", monthStart.toISOString())
      .order("taken_at", { ascending: true });
    return (data ?? []).map((r) => row(r as Record<string, unknown>));
  } catch {
    return [];
  }
}

/**
 * Has this person agreed to us keeping their readings?
 *
 * A blood sugar number is sensitive personal data under the NDPA, which wants
 * consent asked for plainly at the point it is collected, not buried in a terms
 * page. Null means never asked, which is what every account made before this
 * feature reads as.
 *
 * Returns true on a failed read so a person who has already agreed is never
 * asked twice because of a dropped connection. Nothing is stored until they
 * agree the first time, so the only way to reach here is to have agreed.
 */
export async function hasHealthConsent(): Promise<boolean> {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return false;
    const { data, error } = await supabase
      .from("profiles")
      .select("health_data_consent_at")
      .eq("id", user.id)
      .single();
    if (error) return true;
    return Boolean(data?.health_data_consent_at);
  } catch {
    return true;
  }
}

/** Stamp the moment they agreed, once. */
export async function giveHealthConsent(): Promise<void> {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    await supabase
      .from("profiles")
      .update({ health_data_consent_at: new Date().toISOString() })
      .eq("id", user.id);
  } catch {
    /* best effort */
  }
}
