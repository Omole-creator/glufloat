/**
 * Creator partnership emails (founder, 2026-10-26). Pure rules shared by the
 * admin page and /api/admin/creators.
 *
 * The Outreach Kit has 5 emails on days 1, 4, 8, 13 and 19, and any reply
 * stops them. Email 2 needs a real user's story and there is none yet, so the
 * kit's own rule applies ("send Email 3 instead"): 4 emails, the kit's
 * Emails 1, 3, 4 and 5, on days 1, 4, 8 and 13. Day N counts from the first.
 * When a real story exists, add Email 2 back here and in the job's prompt.
 */
export const OUTREACH_DAYS = [1, 4, 8, 13] as const;
/** Which email of the Outreach Kit each step sends. */
export const KIT_EMAIL = [1, 3, 4, 5] as const;
export const OUTREACH_STEPS = OUTREACH_DAYS.length;

export type OutreachStatus = "emailing" | "replied" | "yes" | "no" | "stopped" | "bounced";

export const STATUS_LABEL: Record<OutreachStatus, string> = {
  emailing: "Emails going out",
  replied: "Replied: answer them",
  yes: "Said yes",
  no: "Said no",
  stopped: "Stopped",
  bounced: "Email bounced",
};

export const STATUSES = Object.keys(STATUS_LABEL) as OutreachStatus[];

export type SentEmail = { step: number; subject: string; sent_at: string; message_id?: string | null };

export type Creator = {
  id: string;
  name: string;
  email: string;
  platform: string | null;
  handle: string | null;
  research: string | null;
  status: OutreachStatus;
  step: number;
  first_sent_at: string | null;
  next_due_at: string | null;
  thread_id: string | null;
  emails: SentEmail[];
  reply_summary: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

/** Only a creator still in the sequence may get another email. */
export function canEmail(status: OutreachStatus): boolean {
  return status === "emailing";
}

/** When the next email is due after `step` emails, or null when all went. */
export function nextDue(firstSentAt: string, step: number): string | null {
  if (step >= OUTREACH_STEPS) return null;
  const days = OUTREACH_DAYS[step] - OUTREACH_DAYS[0];
  return new Date(new Date(firstSentAt).getTime() + days * 86_400_000).toISOString();
}

export function gmailThreadUrl(threadId: string): string {
  return `https://mail.google.com/mail/u/?authuser=glufloat@gmail.com#all/${threadId}`;
}
