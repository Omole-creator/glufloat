/**
 * Creator partnership emails (founder, 2026-10-26). Pure rules shared by the
 * admin page and /api/admin/creators.
 *
 * The Outreach Kit sends 5 emails on days 1, 4, 8, 13 and 19, and any reply
 * stops them. Day N is counted from the first email.
 */
export const OUTREACH_DAYS = [1, 4, 8, 13, 19] as const;
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

/** When the next email is due after `step` emails, or null when all 5 went. */
export function nextDue(firstSentAt: string, step: number): string | null {
  if (step >= OUTREACH_STEPS) return null;
  const days = OUTREACH_DAYS[step] - OUTREACH_DAYS[0];
  return new Date(new Date(firstSentAt).getTime() + days * 86_400_000).toISOString();
}

export function gmailThreadUrl(threadId: string): string {
  return `https://mail.google.com/mail/u/?authuser=glufloat@gmail.com#all/${threadId}`;
}
