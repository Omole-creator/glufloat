/**
 * One email to one hospital or HMO, written in /admin/email (founder,
 * 2026-10-19). Sent through Mailyte's application mail (`POST /messages`,
 * MAILYTE_SEND_KEY), the same path as the founder alert in lib/notify.ts,
 * NOT a campaign: it goes to one organisation, so it carries no unsubscribe
 * footer and no user list is touched.
 *
 * Mailyte only sends from an address that is a VERIFIED sender in Mailyte.
 * ImprovMX (where these addresses were made) only receives mail, so each one
 * must also be added as a sender in Mailyte. Replies come back to the
 * address itself and ImprovMX forwards them as usual.
 */

/** The four addresses the founder made for this (names are his). */
export const DIRECT_SENDERS = [
  { email: "hmo@glufloat.com", name: "GluFloat for HMO" },
  { email: "hospital@glufloat.com", name: "GluFloat for Hospital" },
  { email: "favour@glufloat.com", name: "Favour from GluFloat" },
  { email: "support@glufloat.com", name: "GluFloat Support" },
] as const;

export type DirectSender = (typeof DIRECT_SENDERS)[number];

export const senderFor = (email: string): DirectSender | undefined =>
  DIRECT_SENDERS.find((s) => s.email === email.trim().toLowerCase());

/**
 * Files: Vercel refuses a request body over 4.5MB, so all files together are
 * kept under 4MB (Mailyte's own limit, 10MB after encoding, is higher).
 */
export const MAX_TOTAL_BYTES = 4 * 1024 * 1024;
export const MAX_FILES = 10;
/** Mailyte refuses Windows programs and scripts; refuse them first, clearly. */
const BLOCKED_EXT = /\.(exe|bat|cmd|com|scr|pif|msi|js|vbs|vbe|jse|wsf|wsh|ps1|cpl|jar|reg|lnk|hta)$/i;

export function fileProblem(files: { name: string; size: number }[]): string | null {
  if (files.length > MAX_FILES) return `Attach at most ${MAX_FILES} files.`;
  const bad = files.find((f) => BLOCKED_EXT.test(f.name));
  if (bad) return `${bad.name} cannot be sent. Programs and scripts are not allowed.`;
  const total = files.reduce((s, f) => s + f.size, 0);
  if (total > MAX_TOTAL_BYTES) return `The files come to ${mb(total)}. Keep them under ${mb(MAX_TOTAL_BYTES)} in total.`;
  return null;
}

export const mb = (n: number) =>
  n < 1024 * 1024 ? `${Math.max(1, Math.round(n / 1024))}KB` : `${(n / 1024 / 1024).toFixed(1)}MB`;

export const isEmail = (s: string) => /^[^\s@,;<>]+@[^\s@,;<>]+\.[^\s@,;<>]+$/.test(s.trim());

const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string);

/** A plain business email: GluFloat bar, the message, the company details. */
export function directEmailHtml(subject: string, senderName: string, bodyHtml: string): string {
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(subject)}</title></head>
<body style="margin:0;background:#f4f7fb;font-family:Arial,Helvetica,sans-serif;color:#0c2a47">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f7fb;padding:24px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:16px;overflow:hidden">
<tr><td style="background:#1b5faa;padding:18px 24px;color:#ffffff;font-size:20px;font-weight:bold">${esc(senderName)}</td></tr>
<tr><td style="padding:24px;font-size:16px;line-height:1.6">${bodyHtml}</td></tr>
<tr><td style="padding:16px 24px 24px;font-size:12px;line-height:1.6;color:#5b6b7e;border-top:1px solid #e3e9f1">
GluFloat &middot; 11 Idris Ogunlaja Drive, Majek, Lagos, Nigeria<br>
support@glufloat.com &middot; <a href="https://www.glufloat.com" style="color:#5b6b7e">glufloat.com</a>
</td></tr></table></td></tr></table></body></html>`;
}

/** The same message as plain text, for mail apps that do not show HTML. */
export function htmlToText(html: string): string {
  return html
    .replace(/<a [^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi, (_, href: string, label: string) =>
      label.replace(/<[^>]+>/g, "").trim() === href ? href : `${label} (${href})`,
    )
    .replace(/<li[^>]*>/gi, "- ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|h2|h3|li|blockquote|ul|ol)>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export interface DirectAttachment {
  name: string;
  content: string; // base64
  content_type: string;
}

export type DirectSendResult = { ok: boolean; status: number | null; detail: string; messageId: string | null };

/**
 * One key per email, made in the browser before the first try and sent again
 * on every retry of it. Mailyte's Idempotency-Key ("glufloat-<ULID>") then
 * returns the first answer instead of sending a second copy, so pressing Send
 * again after a slow connection can never email a hospital twice.
 */
const ULID_CHARS = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
export function newSendKey(): string {
  let t = Date.now();
  let time = "";
  for (let i = 0; i < 10; i++) {
    time = ULID_CHARS[t % 32] + time;
    t = Math.floor(t / 32);
  }
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  let rand = "";
  for (const b of bytes) rand += ULID_CHARS[b % 32];
  return time + rand;
}
export const isSendKey = (k: string) => /^[0-9A-HJKMNP-TV-Z]{26}$/.test(k);

/** Send it. Never throws. */
export async function sendDirectEmail(args: {
  from: string;
  to: string;
  cc: string[];
  subject: string;
  html: string;
  text: string;
  attachments: DirectAttachment[];
  /** newSendKey(), the same on every retry of one email. */
  sendKey: string;
}): Promise<DirectSendResult> {
  const key = process.env.MAILYTE_SEND_KEY;
  if (!key) return { ok: false, status: null, detail: "MAILYTE_SEND_KEY is not set on the server.", messageId: null };
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 25000);
    const res = await fetch("https://app.mailyte.com/api/v1/messages", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
        Accept: "application/json",
        "Idempotency-Key": `glufloat-${args.sendKey}`,
      },
      body: JSON.stringify({
        to: [args.to],
        ...(args.cc.length ? { cc: args.cc } : {}),
        from: args.from,
        reply_to: args.from,
        subject: args.subject,
        html: args.html,
        text: args.text,
        tags: ["direct-email"],
        tracking: false,
        ...(args.attachments.length ? { attachments: args.attachments } : {}),
      }),
      signal: ctrl.signal,
    });
    clearTimeout(t);
    const j = (await res.json().catch(() => ({}))) as { message?: string; data?: { message_id?: string } };
    if (res.ok) return { ok: true, status: res.status, detail: "Sent.", messageId: j.data?.message_id ?? null };
    if (res.status === 409)
      return { ok: false, status: 409, detail: "This email is still being sent. Wait a minute, then press Send again.", messageId: null };
    return { ok: false, status: res.status, detail: j.message ?? res.statusText, messageId: null };
  } catch (e) {
    const slow = e instanceof Error && e.name === "AbortError";
    return {
      ok: false,
      status: null,
      detail: slow ? "Mailyte took too long to answer. Press Send again: the same email will not go twice." : e instanceof Error ? e.message : "Could not reach Mailyte.",
      messageId: null,
    };
  }
}
