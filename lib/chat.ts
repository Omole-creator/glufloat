/**
 * The in-app chat between a patient and their care team (2026-10-15), the
 * pure part: shapes, limits and the rules for "waiting" and "unread". No I/O,
 * so `npx tsx scripts/chat-test.ts` proves every rule with no server.
 *
 * Founder's rules, kept here so nothing else invents its own:
 *  * Text only. A message is 1 to CHAT_MAX letters after trimming.
 *  * Hospital and dietitian-practice patients have ONE chat with the whole care
 *    team; every doctor and dietitian there can answer. Premium patients chat
 *    with their own in-house dietitian.
 *  * The chat never reads sugar numbers out of a message. The red sugar flag
 *    comes only from tests saved in the app (lib/safetyFlag.ts).
 */

export const CHAT_MAX = 2000;

/** Who wrote a message. "admin" is a dietitian's practice owner or a hospital admin. */
export type SenderRole = "patient" | "doctor" | "dietitian" | "admin";

export type ChatMessage = {
  id: number;
  mine: boolean;
  senderRole: SenderRole;
  senderName: string;
  body: string;
  createdAt: string;
};

export type ThreadTimes = {
  lastPatientAt: string | null;
  lastStaffAt: string | null;
  patientReadAt: string | null;
  staffClearedAt: string | null;
};

/** Trimmed text, or null when there is nothing to send. Cut at CHAT_MAX. */
export function cleanBody(raw: unknown): string | null {
  const s = String(raw ?? "")
    .replace(/\r\n?/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  if (!s) return null;
  return s.slice(0, CHAT_MAX);
}

const t = (iso: string | null) => (iso ? new Date(iso).getTime() : 0);

/**
 * The patient's last message has no answer yet: it is newer than the care
 * team's last message and than any "No reply needed".
 */
export function isWaiting(x: ThreadTimes): boolean {
  if (!x.lastPatientAt) return false;
  return t(x.lastPatientAt) > Math.max(t(x.lastStaffAt), t(x.staffClearedAt));
}

/** Since when the patient has been waiting (their last message), or null. */
export function waitingSince(x: ThreadTimes): string | null {
  return isWaiting(x) ? x.lastPatientAt : null;
}

/** The care team wrote since the patient last opened the chat. */
export function unreadForPatient(x: ThreadTimes): boolean {
  if (!x.lastStaffAt) return false;
  return t(x.lastStaffAt) > t(x.patientReadAt);
}

/** How the waiting time reads on a dashboard: "5 min", "3 hours", "2 days". */
export function waitLabel(sinceIso: string, now = Date.now()): string {
  const min = Math.max(0, Math.floor((now - new Date(sinceIso).getTime()) / 60000));
  if (min < 60) return `${Math.max(1, min)} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h} ${h === 1 ? "hour" : "hours"}`;
  const d = Math.floor(h / 24);
  return `${d} ${d === 1 ? "day" : "days"}`;
}

/** Shown under a care-team message: "Dr Chidi, doctor". */
export const ROLE_WORD: Record<SenderRole, string> = {
  patient: "patient",
  doctor: "doctor",
  dietitian: "dietitian",
  admin: "dietitian",
};

/** A message's time, Nigerian clock: "2:05pm". */
export function clockLabel(iso: string): string {
  const d = new Date(new Date(iso).getTime() + 60 * 60000);
  let h = d.getUTCHours();
  const m = d.getUTCMinutes();
  const ap = h >= 12 ? "pm" : "am";
  h = h % 12 || 12;
  return `${h}:${String(m).padStart(2, "0")}${ap}`;
}

/** The WAT calendar day of a message, for the day lines in the chat ("2026-10-15"). */
export function watDay(iso: string): string {
  return new Date(new Date(iso).getTime() + 60 * 60000).toISOString().slice(0, 10);
}

/** "Today", "Yesterday" or "Mon 12 Oct", against the WAT day of `now`. */
export function dayLabel(day: string, now = Date.now()): string {
  const today = watDay(new Date(now).toISOString());
  const yesterday = watDay(new Date(now - 86400000).toISOString());
  if (day === today) return "Today";
  if (day === yesterday) return "Yesterday";
  return new Date(`${day}T12:00:00Z`).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
}

/** Admin's chase list: a patient waiting longer than this shows up. */
export const CHASE_AFTER_MS = 24 * 60 * 60 * 1000;
