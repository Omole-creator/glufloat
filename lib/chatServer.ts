import webpush from "web-push";
import type { RequestOptions } from "web-push";
import type { SupabaseClient } from "@supabase/supabase-js";
import { hospitalLive } from "@/lib/hospitalPlans";
import type { HospitalRow, StaffRole } from "@/lib/hospitalServer";
import type { ChatMessage, SenderRole, ThreadTimes } from "@/lib/chat";

/**
 * Server side of the in-app chat (lib/chat.ts holds the pure rules). Every
 * chat table has RLS on with no policies (supabase/chat-schema.sql), so all of
 * this runs with the service role AFTER the caller has worked out who is
 * asking from the session cookie.
 */

export type ThreadRow = {
  id: string;
  patient_id: string;
  hospital_id: string | null;
  dietitian_id: string | null;
  last_message_at: string | null;
  last_patient_at: string | null;
  last_staff_at: string | null;
  patient_read_at: string | null;
  staff_cleared_at: string | null;
};

export const THREAD_COLS =
  "id,patient_id,hospital_id,dietitian_id,last_message_at,last_patient_at,last_staff_at,patient_read_at,staff_cleared_at";

export function times(t: ThreadRow): ThreadTimes {
  return {
    lastPatientAt: t.last_patient_at,
    lastStaffAt: t.last_staff_at,
    patientReadAt: t.patient_read_at,
    staffClearedAt: t.staff_cleared_at,
  };
}

/** True once supabase/chat-schema.sql has been pasted in. */
export async function chatReady(admin: SupabaseClient): Promise<boolean> {
  const { error } = await admin.from("chat_threads").select("id").limit(1);
  return !error;
}

export type TeamMember = { userId: string; name: string; role: SenderRole };

/** Who a patient chats with. */
export type PatientTeam =
  | {
      kind: "hospital";
      hospital: HospitalRow;
      patientRowId: string;
      /** The doctors and dietitians who answer (for a practice, the dietitian who runs it). */
      members: TeamMember[];
      /** The number the "Call" button rings for anything urgent. */
      callPhone: string | null;
    }
  | {
      kind: "premium";
      dietitianId: string;
      dietitianName: string;
      /** The login she answers from, or null until it is linked (then nobody can answer yet). */
      dietitianUserId: string | null;
      /** Her number, for the Call button (founder put it back, 2026-10-16). */
      callPhone: string | null;
    };

/** The doctors and dietitians who answer a hospital's chats. */
export async function careTeam(admin: SupabaseClient, hospital: Pick<HospitalRow, "id" | "kind">): Promise<TeamMember[]> {
  const { data } = await admin
    .from("hospital_staff")
    .select("user_id,role,name,created_at")
    .eq("hospital_id", hospital.id)
    .order("created_at", { ascending: true });
  const staff = (data ?? []) as { user_id: string; role: StaffRole; name: string }[];
  // A dietitian's practice is run by her (role "admin"): she is the team.
  if (hospital.kind === "dietitian") return staff.map((s) => ({ userId: s.user_id, name: s.name, role: "dietitian" as const }));
  return staff
    .filter((s) => s.role === "doctor" || s.role === "dietitian")
    .map((s) => ({ userId: s.user_id, name: s.name, role: s.role }));
}

/** May this staff member write in a hospital's chats? Doctors, dietitians, and a practice's own dietitian. */
export function canAnswer(role: StaffRole, hospital: Pick<HospitalRow, "kind">): boolean {
  return hospital.kind === "dietitian" || role === "doctor" || role === "dietitian";
}

/**
 * The Premium dietitian this person is assigned to (assign_dietitian, sticky
 * and in rotation). A person still tied to a dietitian who has since been
 * switched off is moved to the next one in the rotation, so nobody is left
 * writing to somebody who will never read it.
 */
async function premiumDietitian(
  admin: SupabaseClient,
  uid: string,
): Promise<{ id: string; name: string; user_id: string | null; phone: string | null } | null> {
  const ask = async () => {
    const { data, error } = await admin.rpc("assign_dietitian", { p_user_id: uid });
    if (error || !data || (data as unknown[]).length === 0) return null;
    return (data as { dietitian_id: string }[])[0].dietitian_id;
  };
  let id = await ask();
  if (!id) return null;
  let { data: row } = await admin.from("inhouse_dietitians").select("id,name,active,user_id,whatsapp_number").eq("id", id).maybeSingle();
  if (row && !row.active) {
    await admin.from("dietitian_assignments").delete().eq("user_id", uid).eq("dietitian_id", id);
    id = await ask();
    if (!id) return null;
    ({ data: row } = await admin.from("inhouse_dietitians").select("id,name,active,user_id,whatsapp_number").eq("id", id).maybeSingle());
  }
  if (!row || !row.active) return null;
  const n = String(row.whatsapp_number ?? "").replace(/\D/g, "");
  const phone = n ? (n.startsWith("234") ? `+${n}` : n) : null;
  return { id: row.id as string, name: row.name as string, user_id: (row.user_id as string | null) ?? null, phone };
}

/**
 * Who this signed-in person chats with, or null when they have no chat
 * (not covered by a hospital and not on Premium). A hospital or practice that
 * covers them comes first, exactly like the rest of the app.
 */
export async function patientTeam(admin: SupabaseClient, uid: string): Promise<PatientTeam | null> {
  const { data: pats } = await admin
    .from("hospital_patients")
    .select("id,status,joined_at,hospitals(*)")
    .eq("user_id", uid)
    .eq("status", "active");
  type Joined = { id: string; joined_at: string | null; hospitals: HospitalRow | null };
  const live = ((pats ?? []) as unknown as Joined[])
    .filter((p) => p.hospitals && hospitalLive(p.hospitals))
    .sort((a, b) => (b.joined_at ?? "").localeCompare(a.joined_at ?? ""));
  const pick = live[0];
  if (pick?.hospitals) {
    const members = await careTeam(admin, pick.hospitals);
    let callPhone = pick.hospitals.contact_phone;
    if (!callPhone && members[0]) {
      const { data: s } = await admin
        .from("hospital_staff")
        .select("phone")
        .eq("hospital_id", pick.hospitals.id)
        .eq("user_id", members[0].userId)
        .maybeSingle();
      callPhone = (s?.phone as string | null) ?? null;
    }
    return { kind: "hospital", hospital: pick.hospitals, patientRowId: pick.id, members, callPhone };
  }

  const { data: sub } = await admin
    .from("subscriptions")
    .select("tier,status,current_period_end")
    .eq("user_id", uid)
    .maybeSingle();
  const premium =
    sub &&
    sub.tier === "dietitian" &&
    (sub.status === "active" || sub.status === "non-renewing") &&
    sub.current_period_end &&
    new Date(sub.current_period_end as string).getTime() > Date.now();
  if (!premium) return null;
  const d = await premiumDietitian(admin, uid);
  if (!d) return null;
  return { kind: "premium", dietitianId: d.id, dietitianName: d.name, dietitianUserId: d.user_id, callPhone: d.phone };
}

/** The chat for this patient and team, made on first use when `create` is set. */
export async function findThread(
  admin: SupabaseClient,
  patientId: string,
  team: { hospitalId: string } | { dietitianId: string },
  create: boolean,
): Promise<ThreadRow | null> {
  const col = "hospitalId" in team ? "hospital_id" : "dietitian_id";
  const val = "hospitalId" in team ? team.hospitalId : team.dietitianId;
  const read = () => admin.from("chat_threads").select(THREAD_COLS).eq("patient_id", patientId).eq(col, val).maybeSingle();
  const { data } = await read();
  if (data || !create) return (data as ThreadRow | null) ?? null;
  // Two first messages at once: one insert wins the unique index, both re-read.
  await admin.from("chat_threads").insert({ patient_id: patientId, [col]: val });
  const again = await read();
  return (again.data as ThreadRow | null) ?? null;
}

/** The newest messages of a chat, oldest first. `afterId` returns only newer ones. */
export async function threadMessages(
  admin: SupabaseClient,
  threadId: string,
  viewerId: string,
  viewerIsPatient: boolean,
  afterId = 0,
): Promise<ChatMessage[]> {
  let q = admin
    .from("chat_messages")
    .select("id,sender_id,sender_role,sender_name,body,created_at")
    .eq("thread_id", threadId)
    .order("id", { ascending: false })
    .limit(300);
  if (afterId > 0) q = q.gt("id", afterId);
  const { data } = await q;
  return ((data ?? []) as { id: number; sender_id: string | null; sender_role: SenderRole; sender_name: string; body: string; created_at: string }[])
    .reverse()
    .map((m) => ({
      id: m.id,
      // A patient's own messages are "mine"; for the care team, every team
      // message is on the right, whoever on the team wrote it.
      mine: viewerIsPatient ? m.sender_role === "patient" : m.sender_role !== "patient",
      senderRole: m.sender_role,
      senderName: m.sender_id === viewerId ? "You" : m.sender_name,
      body: m.body,
      createdAt: m.created_at,
    }));
}

/** Save a message and move the thread's clocks. Returns the saved message id, or null. */
export async function saveMessage(
  admin: SupabaseClient,
  thread: ThreadRow,
  sender: { id: string; role: SenderRole; name: string },
  body: string,
): Promise<number | null> {
  const { data, error } = await admin
    .from("chat_messages")
    .insert({ thread_id: thread.id, sender_id: sender.id, sender_role: sender.role, sender_name: sender.name.slice(0, 120), body })
    .select("id,created_at")
    .single();
  if (error || !data) return null;
  const at = data.created_at as string;
  const update: Record<string, string> = { last_message_at: at };
  if (sender.role === "patient") {
    update.last_patient_at = at;
    // Writing means they have seen everything above it.
    update.patient_read_at = at;
  } else update.last_staff_at = at;
  await admin.from("chat_threads").update(update).eq("id", thread.id);
  return data.id as number;
}

/** A patient's name as their care team sees it. */
export async function patientName(admin: SupabaseClient, uid: string, fallback?: string | null): Promise<string> {
  const { data } = await admin.from("profiles").select("name").eq("id", uid).maybeSingle();
  return ((data?.name as string | null) || fallback || "Your patient").trim();
}

/**
 * High urgency so a dozing Android phone does not hold it (the lesson of the
 * 7am reminder, app/api/push/send/route.ts), and a day to live.
 */
const CHAT_PUSH: RequestOptions = { urgency: "high", TTL: 24 * 60 * 60 };

/**
 * A phone alert to every device of these people. Never says what the message
 * says: a phone left on a table must not show someone's health question. Any
 * failure is swallowed, because the message is already saved and the red dot
 * shows it either way.
 */
export async function pushTo(
  admin: SupabaseClient,
  userIds: string[],
  payload: { title: string; body: string; url: string; tag: string },
): Promise<void> {
  const ids = [...new Set(userIds.filter(Boolean))];
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (ids.length === 0 || !publicKey || !privateKey) return;
  try {
    webpush.setVapidDetails(process.env.VAPID_SUBJECT || "mailto:glufloat@gmail.com", publicKey, privateKey);
    const { data } = await admin.from("push_subscriptions").select("id,endpoint,p256dh,auth").in("user_id", ids);
    const subs = (data ?? []) as { id: number; endpoint: string; p256dh: string; auth: string }[];
    const gone: number[] = [];
    await Promise.all(
      subs.map((s) =>
        webpush
          .sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, JSON.stringify(payload), {
            ...CHAT_PUSH,
            topic: payload.tag.replace(/[^A-Za-z0-9_-]/g, "").slice(0, 32),
          })
          .catch((e: { statusCode?: number }) => {
            if (e?.statusCode === 404 || e?.statusCode === 410) gone.push(s.id);
          }),
      ),
    );
    if (gone.length) await admin.from("push_subscriptions").delete().in("id", gone);
  } catch {
    /* the red dot still shows it */
  }
}

/** The in-house dietitian rows this login answers for (usually one, or none). */
export async function inboxDietitians(admin: SupabaseClient, uid: string): Promise<{ id: string; name: string }[]> {
  const { data, error } = await admin.from("inhouse_dietitians").select("id,name").eq("user_id", uid);
  if (error) return [];
  return (data ?? []) as { id: string; name: string }[];
}
