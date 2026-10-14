import type { SupabaseClient } from "@supabase/supabase-js";
import { fetchAll } from "@/lib/adminFetch";
import type { PatientRow } from "@/lib/hospitalServer";
import { isPhoneLoginEmail } from "@/lib/phoneLogin";
import type { Reading } from "@/lib/glucose";
import { beforeMealFlag, mealPatternFlags, safetyEvents, type BeforeFlag, type PatternMeal, type SafetyEvent } from "@/lib/safetyFlag";

/**
 * The hospital's patient list with what a doctor scans for first: when the
 * patient last used GluFloat, how much they logged in the last 30 days, and
 * their latest sugar test and HbA1c, as plain numbers.
 *
 * Ordinary numbers carry no colour and no "high" or "low": the doctor judges.
 * Two things ARE flagged: "Not opened in 7 days" (use, not health), and the
 * red safety flag (lib/safetyFlag.ts: under 70, over 300, or a drop after a
 * meal, in the last 14 days, minus what was marked seen), and the two amber
 * flags (before-meal sugar mostly above the patient's target; the same meal
 * high 3 of 3). Only clinicians ever see them.
 */

const DAY_MS = 86400000;

export type RosterRow = {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  status: PatientRow["status"];
  userId: string | null;
  inviteToken: string | null;
  createdAt: string;
  joinedAt: string | null;
  /** Logs in with phone + password (the hospital can reset it). */
  phoneLogin: boolean;
  lastActive: string | null;
  meals30: number;
  tests30: number;
  latestReading: { mgdl: number; takenAt: string } | null;
  latestHba1c: { percent: number; testedOn: string } | null;
  /** Sugar tests that need a look soon, newest first (lib/safetyFlag.ts). */
  safety: SafetyEvent[];
  /** Amber: most before-meal tests above the patient's target, or null. */
  beforeFlag: BeforeFlag | null;
  /** Amber: plates whose last 3 complete meal tests were all high. */
  patterns: string[];
  /** When the patient's payment to their dietitian or hospital runs out (patient-paid-schema.sql), or null. */
  paidUntil: string | null;
  /** A paused patient's countdown, frozen at the pause (ms left), or null. */
  pausedLeftMs: number | null;
};

export async function hospitalRoster(admin: SupabaseClient, hospitalId: string): Promise<RosterRow[]> {
  const { data } = await admin
    .from("hospital_patients")
    .select("*")
    .eq("hospital_id", hospitalId)
    .neq("status", "removed")
    .order("created_at", { ascending: false });
  const pats = (data ?? []) as PatientRow[];
  const ids = pats.map((p) => p.user_id).filter((x): x is string => !!x);

  const since30 = new Date(Date.now() - 30 * DAY_MS).toISOString();
  const since90 = new Date(Date.now() - 90 * DAY_MS).toISOString();
  const last = new Map<string, string>();
  const bump = (uid: string, at: string) => {
    if (!last.has(uid) || (last.get(uid) as string) < at) last.set(uid, at);
  };
  const meals = new Map<string, number>();
  const tests = new Map<string, number>();
  const latest = new Map<string, { mgdl: number; takenAt: string }>();
  const hba1c = new Map<string, { percent: number; testedOn: string }>();
  const emails = new Map<string, string | null>();
  const readings = new Map<string, Reading[]>();
  const mealsBy = new Map<string, PatternMeal[]>();

  // In slices, so a 200-patient hospital never builds one enormous URL.
  for (let i = 0; i < ids.length; i += 100) {
    const slice = ids.slice(i, i + 100);
    const [usage, mc, gr, hb, pr] = await Promise.all([
      fetchAll<{ user_id: string; created_at: string }>(() =>
        admin.from("usage_events").select("user_id,created_at").in("user_id", slice).gte("created_at", since90),
      ),
      fetchAll<{ id: number; user_id: string; kind: "single" | "meal"; label: string; checked_at: string; started_at: string | null; food_ids: string[] | null }>(() =>
        admin
          .from("meal_checks")
          .select("id,user_id,kind,label,checked_at,started_at,food_ids")
          .in("user_id", slice)
          .gte("checked_at", since90),
      ),
      fetchAll<{ id: number; user_id: string; taken_at: string; mgdl: number; meal_check_id: number | null; context: Reading["context"] }>(() =>
        admin
          .from("glucose_readings")
          .select("id,user_id,taken_at,mgdl,meal_check_id,context")
          .in("user_id", slice)
          .gte("taken_at", since90),
      ),
      fetchAll<{ user_id: string; percent: number; tested_on: string }>(() =>
        admin.from("hba1c_results").select("user_id,percent,tested_on").in("user_id", slice),
      ),
      admin.from("profiles").select("id,email").in("id", slice),
    ]);
    for (const r of usage.rows) bump(r.user_id, r.created_at);
    for (const r of mc.rows) {
      bump(r.user_id, r.checked_at);
      if (r.checked_at >= since30) meals.set(r.user_id, (meals.get(r.user_id) ?? 0) + 1);
      const ml = mealsBy.get(r.user_id) ?? [];
      ml.push({
        id: r.id,
        kind: r.kind,
        label: r.label,
        checkedAt: r.checked_at,
        startedAt: r.started_at ?? null,
        foodIds: Array.isArray(r.food_ids) ? r.food_ids : null,
      });
      mealsBy.set(r.user_id, ml);
    }
    for (const r of gr.rows) {
      bump(r.user_id, r.taken_at);
      if (r.taken_at >= since30) tests.set(r.user_id, (tests.get(r.user_id) ?? 0) + 1);
      const cur = latest.get(r.user_id);
      if (!cur || cur.takenAt < r.taken_at) latest.set(r.user_id, { mgdl: Number(r.mgdl), takenAt: r.taken_at });
      const list = readings.get(r.user_id) ?? [];
      list.push({
        id: r.id,
        mealCheckId: r.meal_check_id ?? null,
        valueRaw: Number(r.mgdl),
        unit: "mgdl",
        mgdl: Number(r.mgdl),
        takenAt: r.taken_at,
        context: r.context ?? null,
      });
      readings.set(r.user_id, list);
    }
    for (const r of hb.rows) {
      const cur = hba1c.get(r.user_id);
      if (!cur || cur.testedOn < r.tested_on) hba1c.set(r.user_id, { percent: Number(r.percent), testedOn: r.tested_on });
    }
    for (const p of (pr.data ?? []) as { id: string; email: string | null }[]) emails.set(p.id, p.email);
  }

  return pats.map((p) => {
    const uid = p.user_id;
    const accountEmail = uid ? emails.get(uid) ?? null : null;
    const flagged = !!uid && p.status === "active";
    const rs = uid ? readings.get(uid) ?? [] : [];
    return {
      id: p.id,
      name: p.name,
      phone: p.phone,
      email: p.email ?? (accountEmail && !isPhoneLoginEmail(accountEmail) ? accountEmail : null),
      status: p.status,
      userId: uid,
      inviteToken: p.invite_token,
      createdAt: p.created_at,
      joinedAt: p.joined_at,
      phoneLogin: isPhoneLoginEmail(accountEmail),
      lastActive: uid ? last.get(uid) ?? null : null,
      meals30: uid ? meals.get(uid) ?? 0 : 0,
      tests30: uid ? tests.get(uid) ?? 0 : 0,
      latestReading: uid ? latest.get(uid) ?? null : null,
      latestHba1c: uid ? hba1c.get(uid) ?? null : null,
      safety: flagged ? safetyEvents(rs, new Date(), p.safety_seen_at ?? null) : [],
      beforeFlag: flagged ? beforeMealFlag(rs, p.before_target_mgdl) : null,
      patterns: flagged ? mealPatternFlags(mealsBy.get(uid as string) ?? [], rs).map((f) => f.label) : [],
      paidUntil: p.paid_until ?? null,
      pausedLeftMs: p.paused_left_ms != null ? Number(p.paused_left_ms) : null,
    };
  });
}
