"use client";

import { createClient } from "@/lib/supabase/client";
import { notifyReadingsChanged } from "./glucoseLog";

/**
 * The 3-month sugar test a doctor orders (HbA1c), hba1c_results in
 * supabase/data-collection-schema.sql.
 *
 * Same rule as every daily sugar test: the number is kept and shown back, and
 * it is NEVER graded. No colour, no "good", no target. A doctor reads it.
 *
 * It is the one long-term outcome the app can record, which is why it exists:
 * without it nothing can ever show whether eating by the app changed anything.
 */

export interface Hba1c {
  id: number;
  percent: number;
  testedOn: string; // YYYY-MM-DD
}

/** Real HbA1c results sit well inside this. Anything outside is a typing slip. */
export const HBA1C_MIN = 3;
export const HBA1C_MAX = 20;

export function parseHba1c(typed: string): number | null {
  const n = Number(typed.replace(",", ".").replace("%", "").trim());
  if (!Number.isFinite(n) || n < HBA1C_MIN || n > HBA1C_MAX) return null;
  return Math.round(n * 10) / 10;
}

/** "7.2% (tested 12 Sep 2026)". Plain, no comment on the number. */
export function formatHba1c(h: Hba1c): string {
  const d = new Date(`${h.testedOn}T12:00:00Z`);
  const when = Number.isNaN(d.getTime())
    ? h.testedOn
    : d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  return `${h.percent}% (tested ${when})`;
}

export async function saveHba1c(percent: number, testedOn: string): Promise<boolean> {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return false;
    const { error } = await supabase
      .from("hba1c_results")
      .insert({ percent, tested_on: testedOn });
    if (error) return false;
    notifyReadingsChanged();
    return true;
  } catch {
    return false;
  }
}

/** The newest result, or null (none yet, or the migration has not run). */
export async function latestHba1c(): Promise<Hba1c | null> {
  try {
    const { data } = await createClient()
      .from("hba1c_results")
      .select("id,percent,tested_on")
      .order("tested_on", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(1);
    const r = data?.[0];
    if (!r) return null;
    return { id: r.id as number, percent: Number(r.percent), testedOn: r.tested_on as string };
  } catch {
    return null;
  }
}

export async function deleteHba1c(id: number): Promise<void> {
  try {
    await createClient().from("hba1c_results").delete().eq("id", id);
    notifyReadingsChanged();
  } catch {
    /* best effort */
  }
}
