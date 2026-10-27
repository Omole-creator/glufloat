/**
 * A rep's link for patients (founder, 2026-10-27): glufloat.com/p/<ref_code>.
 * The same ref_code as the rep's doctor link, so every rep has one already.
 *
 * The link remembers the rep in a hidden httpOnly cookie, then opens the home
 * page. The account is tied to the rep the first time the patient opens /app
 * (POST /api/referral, the same call the invite-a-friend link uses), so the
 * sign-up form and trigger did not change. Money: lib/careFees.ts
 * splitRepPatientPayment, written by lib/careFeesServer.ts earnCareFees.
 *
 * Server only. Fails quietly before supabase/rep-patients-schema.sql (#38).
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { isInternalEmail } from "@/lib/internalAccounts";

export const REP_PATIENT_COOKIE = "gf_rppt";
export const REP_PATIENT_COOKIE_DAYS = 60;

/** Only a NEW account can be credited to a rep, never somebody who joined months ago. */
const ATTACH_WITHIN_MS = 30 * 86_400_000;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** The active rep whose patient link this is (by ref_code), or null. */
export async function repForCode(admin: SupabaseClient, code: string): Promise<string | null> {
  const { data, error } = await admin.from("field_agents").select("id,status").eq("ref_code", code.toLowerCase()).maybeSingle();
  if (error || !data || data.status !== "active") return null;
  return data.id as string;
}

/**
 * Tie a new account to the rep whose patient link it came through. Only an
 * account under 30 days old, that has never paid, is not one of ours, and is
 * not already tied to a rep (first touch: the primary key on user_id).
 */
export async function attachRepPatient(admin: SupabaseClient, userId: string, agentId: string): Promise<boolean> {
  try {
    if (!UUID.test(agentId)) return false;
    const { data: prof } = await admin.from("profiles").select("created_at,email").eq("id", userId).maybeSingle();
    if (!prof?.created_at || Date.now() - new Date(prof.created_at as string).getTime() > ATTACH_WITHIN_MS) return false;
    if (isInternalEmail((prof.email as string | null) ?? "")) return false;
    const { count } = await admin.from("payments").select("reference", { count: "exact", head: true }).eq("user_id", userId);
    if ((count ?? 0) > 0) return false;
    const { data: rep } = await admin.from("field_agents").select("id,status").eq("id", agentId).maybeSingle();
    if (!rep || rep.status !== "active") return false;
    const { error } = await admin.from("rep_patients").insert({ user_id: userId, agent_id: agentId });
    return !error;
  } catch {
    return false;
  }
}

/** The rep this patient came through, and when they were tied, or null. */
export async function repPatientLink(admin: SupabaseClient, userId: string): Promise<{ agentId: string; attachedAt: string } | null> {
  const { data, error } = await admin.from("rep_patients").select("agent_id,attached_at").eq("user_id", userId).maybeSingle();
  if (error || !data) return null;
  return { agentId: data.agent_id as string, attachedAt: data.attached_at as string };
}
