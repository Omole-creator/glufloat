/**
 * Conversations with hospitals, HMOs and anyone emailed from /admin/email
 * (2026-11-02). Pure rules, shared by the page, the routes and
 * scripts/email-thread-test.ts. Schema: supabase/direct-email-thread-schema.sql (#39).
 *
 * The first email lives in direct_emails; every message after it (their
 * replies, our answers) is a direct_email_messages row. Threading uses the
 * standard headers: our answer carries In-Reply-To (the message it answers)
 * and References (every Message-ID in the conversation, oldest first), so
 * their mail app puts it under the earlier emails.
 */

export type ThreadMessage = {
  id: string;
  email_id: string;
  direction: "in" | "out";
  at: string;
  from_email: string | null;
  from_name: string | null;
  to_email: string | null;
  cc: string | null;
  subject: string | null;
  body_text: string | null;
  html: string | null;
  message_id: string | null;
};

/** "Re: <subject>", never "Re: Re: ...". */
export function replySubject(subject: string): string {
  const s = subject.trim();
  return /^re\s*:/i.test(s) ? s : `Re: ${s}`;
}

/**
 * A real Message-ID, always written with its angle brackets, or null. A
 * reply the job saved by its Gmail id ("gmail:1a19...") is not one: it keeps
 * the reply from being saved twice, but never goes into our headers.
 */
export function normalizeMessageId(id: string | null | undefined): string | null {
  const s = String(id ?? "").trim();
  if (!s || /\s/.test(s) || s.length > 300 || !s.includes("@") || /^gmail:/i.test(s)) return null;
  return s.startsWith("<") ? s : `<${s.replace(/>$/, "")}>`;
}

/** The key a reply is saved under when the job only knows its Gmail id. */
export const gmailKey = (gmailId: string) => `gmail:${gmailId.trim()}`;

/** Messages oldest first. */
export const byTime = (a: { at: string }, b: { at: string }) => new Date(a.at).getTime() - new Date(b.at).getTime();

/**
 * The headers for our next answer. References lists the first email and
 * every later message, oldest first, without repeats; In-Reply-To is the
 * newest of them. Mail apps only need the last few, so very long
 * conversations keep the first and the newest 15.
 */
export function threadHeaders(firstId: string | null, messages: Pick<ThreadMessage, "at" | "message_id">[]): Record<string, string> {
  const ids: string[] = [];
  for (const id of [firstId, ...[...messages].sort(byTime).map((m) => m.message_id)]) {
    const n = normalizeMessageId(id);
    if (n && !ids.includes(n)) ids.push(n);
  }
  if (!ids.length) return {};
  const refs = ids.length > 16 ? [ids[0], ...ids.slice(-15)] : ids;
  return { "In-Reply-To": ids[ids.length - 1], References: refs.join(" ") };
}

/**
 * Who our answer goes to: whoever wrote to us last (a colleague may answer
 * for the person we first emailed), else the person we first emailed.
 */
export function replyRecipient(firstTo: string, messages: Pick<ThreadMessage, "at" | "direction" | "from_email">[]): string {
  const lastIn = [...messages].sort(byTime).filter((m) => m.direction === "in" && m.from_email).pop();
  return (lastIn?.from_email ?? firstTo).trim().toLowerCase();
}

/** The copy line for our answer: the first email's copies, minus the recipient and our own addresses. */
export function replyCc(firstCc: string | null, to: string): string[] {
  return String(firstCc ?? "")
    .split(/[,;\s]+/)
    .map((s) => s.trim().toLowerCase())
    .filter((s) => s && s !== to && !s.endsWith("@glufloat.com"))
    .filter((s, i, all) => all.indexOf(s) === i);
}

/**
 * True when they wrote last: a reply has come in since our last message,
 * and since the admin last pressed "No answer needed" (doneAt).
 * This is what "waiting for you" means on the page.
 */
export function waitingForUs(messages: Pick<ThreadMessage, "at" | "direction">[], doneAt?: string | null): boolean {
  const last = [...messages].sort(byTime).pop();
  if (last?.direction !== "in") return false;
  return !doneAt || new Date(doneAt).getTime() < new Date(last.at).getTime();
}

/**
 * Cut the quoted earlier email off a reply, so the page shows only what they
 * wrote. Stops at the first "On ... wrote:" line, a "-----Original Message-----"
 * or "From: ... Sent:" block, or the first line of "> " quoting.
 */
export function stripQuoted(text: string): string {
  const lines = text.replace(/\r\n?/g, "\n").split("\n");
  const out: string[] = [];
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i].trim();
    // "On Mon, 19 Oct 2026 ... wrote:" can wrap over two lines.
    const two = `${l} ${(lines[i + 1] ?? "").trim()}`;
    if (/^on\b.{0,200}\bwrote:$/i.test(l) || /^on\b.{0,250}\bwrote:$/i.test(two)) break;
    if (/^-{2,}\s*original message\s*-{2,}$/i.test(l)) break;
    if (/^from:\s.+/i.test(l) && /^(sent|date):\s/i.test((lines[i + 1] ?? "").trim())) break;
    if (/^>/.test(l)) break;
    out.push(lines[i]);
  }
  const s = out.join("\n").replace(/\n{3,}/g, "\n\n").trim();
  return s || text.trim();
}
