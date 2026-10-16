import type { SupabaseClient } from "@supabase/supabase-js";
import { CHASE_AFTER_MS, waitingSince } from "@/lib/chat";
import { whatsappNumber } from "@/lib/hospitalServer";
import { isInternalEmail } from "@/lib/internalAccounts";
import { THREAD_COLS, type ThreadRow } from "@/lib/chatServer";

export type ChaseRow = {
  /** "Dtn Favour Chiamaka", or a hospital's or practice's name. */
  name: string;
  kind: "premium" | "hospital" | "practice" | "doctor";
  /** Patients waiting more than a day. */
  waiting: number;
  /** When the longest-waiting patient wrote. */
  oldest: string;
  /** Where the admin nudges them on WhatsApp, or null. */
  whatsapp: string | null;
};

export type ChatStats = {
  ready: boolean;
  /** Patients waiting for a reply right now, any length of time. */
  waitingNow: number;
  /** Messages in the period, by side. Counts only, never words. */
  fromPatients: number;
  fromTeams: number;
  /** Everybody who has kept a patient waiting more than a day, longest first. */
  chase: ChaseRow[];
};

/**
 * The admin's view of the chat (founder, 2026-10-15): counts only. Message
 * words never reach /admin, and neither do patients' names; the chase list
 * names the dietitian or hospital to nudge, with how many are waiting.
 */
export async function chatStats(admin: SupabaseClient, from: Date, to: Date): Promise<ChatStats> {
  const empty: ChatStats = { ready: false, waitingNow: 0, fromPatients: 0, fromTeams: 0, chase: [] };
  const { data: allThreads, error } = await admin.from("chat_threads").select(THREAD_COLS).not("last_message_at", "is", null);
  if (error) return empty;

  // Test and demo accounts are left out, like every other admin number.
  const patientIds = [...new Set(((allThreads ?? []) as ThreadRow[]).map((t) => t.patient_id))];
  const { data: emails } = patientIds.length
    ? await admin.from("profiles").select("id,email").in("id", patientIds)
    : { data: [] };
  const internal = new Set(((emails ?? []) as { id: string; email: string | null }[]).filter((p) => isInternalEmail(p.email)).map((p) => p.id));
  const threads = ((allThreads ?? []) as ThreadRow[]).filter((t) => !internal.has(t.patient_id));
  const threadIds = threads.map((t) => t.id);

  const count = async (patient: boolean) => {
    if (threadIds.length === 0) return 0;
    let q = admin
      .from("chat_messages")
      .select("id", { count: "exact", head: true })
      .in("thread_id", threadIds)
      .gte("created_at", from.toISOString())
      .lt("created_at", to.toISOString());
    q = patient ? q.eq("sender_role", "patient") : q.neq("sender_role", "patient");
    const { count: n } = await q;
    return n ?? 0;
  };
  const [fromPatients, fromTeams] = await Promise.all([count(true), count(false)]);

  const now = Date.now();
  const waiting = threads
    .map((t) => ({
      t,
      since: waitingSince({ lastPatientAt: t.last_patient_at, lastStaffAt: t.last_staff_at, patientReadAt: t.patient_read_at, staffClearedAt: t.staff_cleared_at }),
    }))
    .filter((x): x is { t: ThreadRow; since: string } => !!x.since);
  const late = waiting.filter((x) => now - new Date(x.since).getTime() > CHASE_AFTER_MS);

  const groups = new Map<string, { key: { hospital?: string; dietitian?: string }; waiting: number; oldest: string }>();
  for (const { t, since } of late) {
    const id = t.hospital_id ? `h:${t.hospital_id}` : `d:${t.dietitian_id}`;
    const g = groups.get(id) ?? { key: t.hospital_id ? { hospital: t.hospital_id } : { dietitian: t.dietitian_id as string }, waiting: 0, oldest: since };
    g.waiting += 1;
    if (since < g.oldest) g.oldest = since;
    groups.set(id, g);
  }

  const hospitalIds = [...groups.values()].map((g) => g.key.hospital).filter((x): x is string => !!x);
  const dietitianIds = [...groups.values()].map((g) => g.key.dietitian).filter((x): x is string => !!x);
  const [{ data: hs }, { data: ds }] = await Promise.all([
    hospitalIds.length ? admin.from("hospitals").select("id,name,kind,contact_phone").in("id", hospitalIds) : Promise.resolve({ data: [] }),
    dietitianIds.length ? admin.from("inhouse_dietitians").select("id,name,whatsapp_number").in("id", dietitianIds) : Promise.resolve({ data: [] }),
  ]);
  const hMap = new Map(((hs ?? []) as { id: string; name: string; kind: string | null; contact_phone: string | null }[]).map((h) => [h.id, h]));
  const dMap = new Map(((ds ?? []) as { id: string; name: string; whatsapp_number: string | null }[]).map((d) => [d.id, d]));

  const chase: ChaseRow[] = [...groups.values()]
    .map((g) => {
      if (g.key.hospital) {
        const h = hMap.get(g.key.hospital);
        return {
          name: h?.name ?? "A hospital",
          kind: h?.kind === "dietitian" ? ("practice" as const) : h?.kind === "doctor" ? ("doctor" as const) : ("hospital" as const),
          waiting: g.waiting,
          oldest: g.oldest,
          whatsapp: whatsappNumber(h?.contact_phone),
        };
      }
      const d = dMap.get(g.key.dietitian as string);
      return { name: d?.name ?? "A dietitian", kind: "premium" as const, waiting: g.waiting, oldest: g.oldest, whatsapp: d?.whatsapp_number ?? null };
    })
    .sort((a, b) => a.oldest.localeCompare(b.oldest));

  return { ready: true, waitingNow: waiting.length, fromPatients, fromTeams, chase };
}
