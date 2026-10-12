import type { SupabaseClient } from "@supabase/supabase-js";
import type { CheckedMeal } from "@/lib/history";
import type { Reading } from "@/lib/glucose";
import type { Hba1c } from "@/lib/hba1c";
import type { Goal } from "@/lib/personalization";
import { weightFlag, weightFlagLine, weightGoal } from "@/lib/weightTrend";
import { bmi } from "@/lib/tdee";

/**
 * One patient's record, read on the SERVER for their hospital's doctors and
 * dietitians. The patient's own app reads the same rows through
 * lib/history.ts, lib/glucoseLog.ts and lib/hba1c.ts under their own login;
 * those files are "use client", so the server cannot call them, and this file
 * shapes the rows the same way. If one of them changes the shape of a
 * CheckedMeal or a Reading, change it here too, or the doctor and the patient
 * see two different reports.
 *
 * Every query filters by user_id explicitly, because the service role ignores
 * the row-level rules the patient's own login relies on.
 */

const DAY_MS = 86400000;

function readingOf(r: Record<string, unknown>): Reading {
  return {
    id: r.id as number,
    mealCheckId: (r.meal_check_id as number | null) ?? null,
    valueRaw: Number(r.value_raw),
    unit: r.unit as Reading["unit"],
    mgdl: Number(r.mgdl),
    takenAt: r.taken_at as string,
    context: (r.context as Reading["context"]) ?? null,
  };
}

/** A month in Nigerian time (WAT, GMT+1), as [start, end) instants. */
export function watMonth(ym: string | null | undefined, now = new Date()): { from: Date; to: Date; label: string; ym: string } {
  const wat = new Date(now.getTime() + 3600000);
  let y = wat.getUTCFullYear();
  let m = wat.getUTCMonth() + 1;
  const match = /^(\d{4})-(\d{2})$/.exec(ym ?? "");
  if (match) {
    y = Number(match[1]);
    m = Math.min(12, Math.max(1, Number(match[2])));
  }
  const from = new Date(Date.UTC(y, m - 1, 1) - 3600000);
  const to = new Date(Date.UTC(y, m, 1) - 3600000);
  const monthName = new Date(Date.UTC(y, m - 1, 15)).toLocaleDateString("en-GB", { month: "long", timeZone: "UTC" });
  const isCurrent = y === wat.getUTCFullYear() && m === wat.getUTCMonth() + 1;
  const lastDay = isCurrent ? wat.getUTCDate() : new Date(Date.UTC(y, m, 0)).getUTCDate();
  const label = lastDay === 1 ? `1 ${monthName} ${y}` : `1 to ${lastDay} ${monthName} ${y}`;
  return { from, to, label, ym: `${y}-${String(m).padStart(2, "0")}` };
}

export async function patientMonth(
  admin: SupabaseClient,
  uid: string,
  from: Date,
  to: Date,
): Promise<{ items: CheckedMeal[]; loose: Reading[] }> {
  const fromIso = from.toISOString();
  const toIso = to.toISOString();
  const { data: meals } = await admin
    .from("meal_checks")
    .select(
      "id,kind,label,verdict,checked_at,started_at,food_ids,sizes,glucose_readings(id,meal_check_id,value_raw,unit,mgdl,taken_at,context)",
    )
    .eq("user_id", uid)
    .gte("checked_at", fromIso)
    .lt("checked_at", toIso)
    .order("checked_at", { ascending: false });
  const items: CheckedMeal[] = ((meals ?? []) as Record<string, unknown>[]).map((row) => {
    const all = (Array.isArray(row.glucose_readings) ? (row.glucose_readings as Record<string, unknown>[]) : [])
      .map(readingOf)
      .sort((a, b) => a.takenAt.localeCompare(b.takenAt));
    return {
      id: row.id as number,
      kind: row.kind as CheckedMeal["kind"],
      label: row.label as string,
      verdict: row.verdict as CheckedMeal["verdict"],
      checkedAt: row.checked_at as string,
      readings: all.filter((r) => r.context !== "before_meal"),
      beforeReadings: all.filter((r) => r.context === "before_meal"),
      startedAt: (row.started_at as string | null | undefined) ?? null,
      foodIds: Array.isArray(row.food_ids) ? (row.food_ids as string[]) : null,
      sizes: Array.isArray(row.sizes) ? (row.sizes as string[]) : null,
    };
  });

  const { data: rs } = await admin
    .from("glucose_readings")
    .select("id,meal_check_id,value_raw,unit,mgdl,taken_at,context")
    .eq("user_id", uid)
    .is("meal_check_id", null)
    .gte("taken_at", fromIso)
    .lt("taken_at", toIso)
    .order("taken_at", { ascending: true });
  const loose = ((rs ?? []) as Record<string, unknown>[]).map(readingOf);
  return { items, loose };
}

export type PatientProfile = {
  name: string | null;
  phone: string | null;
  sex: string | null;
  ageYears: number | null;
  weightKg: number | null;
  heightCm: number | null;
  activityLevel: string | null;
  goals: string[];
  conditions: string[];
  medDosesPerDay: number | null;
  medTimes: string[];
  medRelation: string | null;
  medTypes: string[];
};

export async function patientProfile(admin: SupabaseClient, uid: string): Promise<PatientProfile> {
  // `*` so a column a migration has not added yet is simply missing, never an error.
  const { data } = await admin.from("profiles").select("*").eq("id", uid).maybeSingle();
  const p = (data ?? {}) as Record<string, unknown>;
  const arr = (v: unknown) => (Array.isArray(v) ? (v as string[]) : []);
  const num = (v: unknown) => (v === null || v === undefined || v === "" ? null : Number(v));
  return {
    name: (p.name as string | null) ?? null,
    phone: (p.phone as string | null) ?? null,
    sex: (p.sex as string | null) ?? null,
    ageYears: num(p.age_years),
    weightKg: num(p.weight_kg),
    heightCm: num(p.height_cm),
    activityLevel: (p.activity_level as string | null) ?? null,
    goals: arr(p.goals),
    conditions: arr(p.conditions),
    medDosesPerDay: num(p.med_doses_per_day),
    medTimes: arr(p.med_times),
    medRelation: (p.med_relation_to_food as string | null) ?? null,
    medTypes: arr(p.med_types),
  };
}

export async function patientHba1cs(admin: SupabaseClient, uid: string): Promise<Hba1c[]> {
  const { data } = await admin
    .from("hba1c_results")
    .select("id,percent,tested_on")
    .eq("user_id", uid)
    .order("tested_on", { ascending: false })
    .limit(20);
  return ((data ?? []) as Record<string, unknown>[]).map((r) => ({
    id: r.id as number,
    percent: Number(r.percent),
    testedOn: r.tested_on as string,
  }));
}

export async function patientWeights(admin: SupabaseClient, uid: string): Promise<{ kg: number; at: string }[]> {
  const { data } = await admin
    .from("weight_history")
    .select("weight_kg,recorded_at")
    .eq("user_id", uid)
    .order("recorded_at", { ascending: true })
    .limit(60);
  return ((data ?? []) as Record<string, unknown>[]).map((r) => ({ kg: Number(r.weight_kg), at: r.recorded_at as string }));
}

/** The same weight line the patient's own report carries (lib/weighIn.ts). */
export function weightLineFor(profile: PatientProfile, weights: { kg: number; at: string }[]): string | null {
  const since = Date.now() - 120 * DAY_MS;
  const recent = weights.filter((w) => new Date(w.at).getTime() >= since);
  const b = profile.weightKg && profile.heightCm ? bmi(profile.weightKg, profile.heightCm) : null;
  const f = weightFlag(recent, weightGoal(profile.goals as Goal[], b));
  return f ? weightFlagLine(f) : null;
}

/** Every sugar test in the last N days, oldest first, for the trend line. */
export async function patientReadings(admin: SupabaseClient, uid: string, days: number): Promise<Reading[]> {
  const { data } = await admin
    .from("glucose_readings")
    .select("id,meal_check_id,value_raw,unit,mgdl,taken_at,context")
    .eq("user_id", uid)
    .gte("taken_at", new Date(Date.now() - days * DAY_MS).toISOString())
    .order("taken_at", { ascending: true })
    .limit(1000);
  return ((data ?? []) as Record<string, unknown>[]).map(readingOf);
}
