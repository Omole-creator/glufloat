/**
 * Field agents, advisors and GluFloat doctors, read once for the admin pages
 * and the agent dashboard (server only). Counts and money only: nothing here
 * carries a patient's name or health data, because an agent's dashboard must
 * never show one.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { fetchAll } from "@/lib/adminFetch";
import { earningTotals, type EarningRow, type PayoutRow } from "@/lib/careFeesServer";

export type FieldAgent = {
  id: string;
  role: "agent" | "advisor";
  name: string;
  phone: string | null;
  email: string | null;
  ref_code: string;
  dash_token: string;
  manager_id: string | null;
  bank_name: string | null;
  bank_code: string | null;
  account_number: string | null;
  account_name: string | null;
  status: "active" | "off";
  created_at: string;
};

export type DoctorRow = {
  id: string;
  code: string;
  name: string;
  contact_email: string | null;
  mdcn_number: string | null;
  status: string;
  agent_id: string | null;
  invited_by: string | null;
  bank_name: string | null;
  account_number: string | null;
  account_name: string | null;
  created_at: string;
};

export type DoctorStats = DoctorRow & {
  /** Patients with them now. */
  patients: number;
  /** Of those, on GluFloat Premium right now. */
  paying: number;
  /** Has the doctor finished setting up (a login)? */
  setUp: boolean;
};

export type FieldTeam = {
  agents: FieldAgent[];
  doctors: DoctorStats[];
  earnings: EarningRow[];
  payouts: PayoutRow[];
};

const EARN_COLS = "id,reference,kind,hospital_id,agent_id,source_hospital_id,patient_user_id,payment_amount,amount,earned_at,payout_id";
const PAYOUT_COLS = "id,hospital_id,agent_id,amount,status,reference,note,created_at";

export async function loadFieldTeam(admin: SupabaseClient): Promise<FieldTeam> {
  const [agents, doctors, earnings, payouts] = await Promise.all([
    fetchAll<FieldAgent>(() => admin.from("field_agents").select("*").order("created_at", { ascending: true })),
    fetchAll<DoctorRow>(() =>
      admin
        .from("hospitals")
        .select("id,code,name,contact_email,mdcn_number,status,agent_id,invited_by,bank_name,account_number,account_name,created_at")
        .eq("kind", "doctor")
        .order("created_at", { ascending: false }),
    ),
    fetchAll<EarningRow>(() => admin.from("clinician_earnings").select(EARN_COLS).order("earned_at", { ascending: false })),
    fetchAll<PayoutRow>(() => admin.from("earning_payouts").select(PAYOUT_COLS).order("created_at", { ascending: false })),
  ]);

  const ids = doctors.rows.map((d) => d.id);
  const patients = new Map<string, string[]>();
  const staffed = new Set<string>();
  for (let i = 0; i < ids.length; i += 100) {
    const slice = ids.slice(i, i + 100);
    const [pats, staff] = await Promise.all([
      fetchAll<{ hospital_id: string; user_id: string | null }>(() =>
        admin.from("hospital_patients").select("hospital_id,user_id").in("hospital_id", slice).eq("status", "active"),
      ),
      admin.from("hospital_staff").select("hospital_id").in("hospital_id", slice),
    ]);
    for (const p of pats.rows) if (p.user_id) patients.set(p.hospital_id, [...(patients.get(p.hospital_id) ?? []), p.user_id]);
    for (const s of (staff.data ?? []) as { hospital_id: string }[]) staffed.add(s.hospital_id);
  }
  const uids = [...new Set([...patients.values()].flat())];
  const premium = new Set<string>();
  for (let i = 0; i < uids.length; i += 100) {
    const { data } = await admin
      .from("subscriptions")
      .select("user_id,tier,status,current_period_end")
      .in("user_id", uids.slice(i, i + 100))
      .eq("tier", "dietitian");
    for (const s of (data ?? []) as { user_id: string; status: string; current_period_end: string | null }[])
      if ((s.status === "active" || s.status === "non-renewing") && s.current_period_end && new Date(s.current_period_end).getTime() > Date.now())
        premium.add(s.user_id);
  }

  return {
    agents: agents.rows,
    doctors: doctors.rows.map((d) => {
      const list = patients.get(d.id) ?? [];
      return { ...d, patients: list.length, paying: list.filter((u) => premium.has(u)).length, setUp: staffed.has(d.id) };
    }),
    earnings: earnings.rows.map((e) => ({ ...e, amount: Number(e.amount) })),
    payouts: payouts.rows.map((p) => ({ ...p, amount: Number(p.amount) })),
  };
}

/** One person's money: a doctor's practice ({ hospitalId }) or a field agent ({ agentId }). */
export function moneyFor(team: FieldTeam, who: { hospitalId: string } | { agentId: string }) {
  const mine = (r: { hospital_id: string | null; agent_id: string | null }) =>
    "hospitalId" in who ? r.hospital_id === who.hospitalId : r.agent_id === who.agentId;
  const earnings = team.earnings.filter(mine);
  const payouts = team.payouts.filter(mine);
  return { earnings, payouts, ...earningTotals(earnings, payouts) };
}

/** Earnings not yet paid out (no payout, or one that failed), for "Mark as paid". */
export function unpaidEarnings(team: FieldTeam, who: { hospitalId: string } | { agentId: string }): EarningRow[] {
  const failed = new Set(team.payouts.filter((p) => p.status === "failed").map((p) => p.id));
  return moneyFor(team, who).earnings.filter((e) => !e.payout_id || failed.has(e.payout_id));
}
