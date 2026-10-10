import { isUserType, type UserType } from "./userType";

/**
 * Sending GluFloat's marketing emails through Mailyte (mailyte.com). Server only.
 *
 * GluFloat's own addresses are on ImprovMX (free), which can only RECEIVE.
 * That does not matter: Mailyte sends from its own servers. It needs (1) each
 * sender address verified, which works because ImprovMX forwards Mailyte's
 * confirmation email, and (2) glufloat.com's SPF/DKIM/DMARC records from
 * Mailyte. See supabase/SETUP.md §5.
 *
 * What this file does: put every user on one Mailyte contact list by who
 * they are (with `first_name` for "Hello Ada"), and write and send campaigns
 * from /admin/email. Campaigns carry the unsubscribe link the law needs.
 *
 * API: https://mailyte.com/developer (base https://app.mailyte.com, Bearer
 * key, every reply wrapped as { message, data, success, code }). The key
 * needs the contacts:read and contacts:write scopes. MAILYTE_API_KEY is a
 * server-only env var, never NEXT_PUBLIC.
 */

const API = "https://app.mailyte.com/api/v1";

/** One Mailyte list per kind of person. Changing a name makes a new list. */
export const GROUP_NAME: Record<UserType | "unset", string> = {
  diabetic: "GluFloat: Diabetic",
  health_pro: "GluFloat: Health professional",
  caregiver: "GluFloat: Caregiver",
  unset: "GluFloat: Not set",
};

export function mailyteConfigured(): boolean {
  return !!process.env.MAILYTE_API_KEY;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** One call, honouring Mailyte's Retry-After on a 429 (up to 3 tries). */
async function my<T = unknown>(path: string, init: RequestInit = {}): Promise<{ status: number; data: T | null }> {
  for (let attempt = 0; ; attempt++) {
    const res = await fetch(`${API}${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${process.env.MAILYTE_API_KEY}`,
        "Content-Type": "application/json",
        Accept: "application/json",
        ...(init.headers ?? {}),
      },
      cache: "no-store",
    });
    if (res.status === 429 && attempt < 3) {
      await sleep(Math.min(10, Number(res.headers.get("Retry-After")) || 2) * 1000);
      continue;
    }
    if (res.status === 401) throw new Error("The Mailyte key is wrong.");
    if (res.status === 403) throw new Error("The Mailyte key needs the contacts:read and contacts:write scopes.");
    const body = (await res.json().catch(() => null)) as { data?: T } | null;
    return { status: res.status, data: body?.data ?? null };
  }
}

type ListRow = { id: string; name: string };

/** The four lists, created if missing. Name → id. */
async function ensureLists(): Promise<Record<string, string>> {
  const ids: Record<string, string> = {};
  for (let page = 1; page <= 10; page++) {
    const r = await my<{ data?: ListRow[] }>(`/contact-lists?per_page=100&page=${page}`);
    if (r.status >= 400) throw new Error(`Mailyte said ${r.status} when reading the lists.`);
    const rows = r.data?.data ?? [];
    for (const l of rows) ids[l.name] = l.id;
    if (rows.length < 100) break;
  }
  for (const name of Object.values(GROUP_NAME)) {
    if (ids[name]) continue;
    const made = await my<ListRow>("/contact-lists", {
      method: "POST",
      body: JSON.stringify({ name, description: "Kept in step by GluFloat admin > Email." }),
    });
    if (!made.data?.id) throw new Error(`Could not make the list "${name}" (${made.status}).`);
    ids[name] = made.data.id;
  }
  return ids;
}

type ContactRow = { id: string; lists?: { id: string; name: string }[] | null };

export interface Contact {
  email: string;
  name: string | null;
  userType: string | null;
}

export interface SyncResult {
  sent: number;
  failed: number;
  byGroup: Record<string, number>;
}

const listKey = (t: string | null) => (t && isUserType(t) ? t : "unset");

/** The first word of a name, for "Hello Ada". Empty when there is no name. */
export function firstName(name: string | null | undefined): string {
  const w = String(name ?? "").trim().split(/\s+/)[0] ?? "";
  return w ? w.charAt(0).toUpperCase() + w.slice(1).toLowerCase() : "";
}

/** The fields every GluFloat contact carries (replaced whole on each write). */
const attrs = (name: string | null, who: string) => ({ first_name: firstName(name), who });

/** Run `fn` over `items`, 4 at a time, so 250 contacts finish in seconds. */
async function eachLimited<T>(items: T[], fn: (t: T, i: number) => Promise<void>): Promise<void> {
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(4, items.length) }, async () => {
      while (next < items.length) {
        const i = next++;
        await fn(items[i], i);
      }
    }),
  );
}

/**
 * Put EVERY user on the list for who they are (founder, 2026-10-07: "just add
 * all the users to their respective category", no yes/no question), and off
 * the other GluFloat lists, so somebody whose kind was corrected on
 * /admin/users moves across. Each carries `first_name` for "Hello Ada".
 *
 * `status_if_new`, never `status`: somebody who pressed "Stop these emails"
 * in one of our emails stays unsubscribed. Mailyte's own docs call overriding
 * that the worst thing the API can do.
 */
export async function syncContacts(contacts: Contact[]): Promise<SyncResult> {
  const lists = await ensureLists();
  const ours = new Set(Object.values(lists));
  const out: SyncResult = { sent: 0, failed: 0, byGroup: {} };

  await eachLimited(contacts, async (c) => {
    const key = listKey(c.userType);
    const name = GROUP_NAME[key];
    const target = lists[name];
    const r = await my<ContactRow>("/contacts", {
      method: "PUT",
      body: JSON.stringify({
        email: c.email,
        name: c.name ?? undefined,
        attributes: attrs(c.name, key),
        status_if_new: "subscribed",
        list_ids: [target],
        source: "GluFloat app",
      }),
    });
    if (r.status >= 400 || !r.data?.id) {
      out.failed += 1;
      return;
    }
    out.sent += 1;
    out.byGroup[name] = (out.byGroup[name] ?? 0) + 1;
    for (const l of r.data.lists ?? []) {
      if (l.id !== target && ours.has(l.id)) {
        await my(`/contact-lists/${l.id}/members/${r.data.id}`, { method: "DELETE" });
      }
    }
  });
  return out;
}

/** Add or update one person on one list (the admin's "Add a contact" form). */
export async function addContact(email: string, name: string, group: keyof typeof GROUP_NAME): Promise<void> {
  const lists = await ensureLists();
  const r = await my<ContactRow>("/contacts", {
    method: "PUT",
    body: JSON.stringify({
      email,
      name: name || undefined,
      attributes: attrs(name, group),
      status_if_new: "subscribed",
      list_ids: [lists[GROUP_NAME[group]]],
      source: "GluFloat admin",
    }),
  });
  if (r.status === 422) throw new Error("Mailyte did not accept that email address.");
  if (r.status >= 400) throw new Error(`Mailyte said ${r.status}.`);
}

/* ---- Writing and sending emails from /admin/email ------------------------ */

/**
 * Where the unsubscribe link goes in our footer. Campaign preflight refuses to
 * send without one (`no_unsubscribe`). `{{ unsubscribe_url }}` is the tag
 * Mailyte's own live preflight asked for (2026-10-07); a Mailchimp-style
 * `*|UNSUB|*` was tried first and refused. If Mailyte ever changes it,
 * preflight says so before anything sends.
 */
export const UNSUB_HREF = "{{ unsubscribe_url }}";

export interface Sender {
  id: string;
  name: string;
  email: string;
  verified: boolean;
}

/** Every sender, verified first, for the From picker. Reads every page. */
export async function listSenders(): Promise<Sender[]> {
  const all: Sender[] = [];
  for (let page = 1; page <= 10; page++) {
    const r = await my<{ data?: { id: string; name: string; email: string; verification?: { state?: string } }[] }>(
      `/senders?per_page=100&page=${page}`,
    );
    if (r.status === 403) throw new Error("The Mailyte key needs the senders:read scope.");
    const rows = r.data?.data ?? [];
    for (const x of rows) {
      all.push({ id: x.id, name: x.name, email: x.email, verified: x.verification?.state === "verified" });
    }
    if (rows.length < 100) break;
  }
  return all.sort((a, b) => Number(b.verified) - Number(a.verified));
}

const escapeHtml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** The email around the message: brand bar, the message, and the footer. */
export function emailHtml(subject: string, bodyHtml: string): string {
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(subject)}</title></head>
<body style="margin:0;background:#f4f7fb;font-family:Arial,Helvetica,sans-serif;color:#0c2a47">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f7fb;padding:24px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:16px;overflow:hidden">
<tr><td style="background:#1b5faa;padding:18px 24px;color:#ffffff;font-size:20px;font-weight:bold">GluFloat</td></tr>
<tr><td style="padding:24px;font-size:16px;line-height:1.6">${bodyHtml}</td></tr>
<tr><td style="padding:16px 24px 24px;font-size:12px;line-height:1.5;color:#5b6b7e;border-top:1px solid #e3e9f1">
You get this email because you said yes to GluFloat emails.<br>
<a href="${UNSUB_HREF}" style="color:#5b6b7e">Stop these emails</a> &middot; <a href="https://www.glufloat.com" style="color:#5b6b7e">glufloat.com</a>
</td></tr></table></td></tr></table></body></html>`;
}

export interface Blocker {
  code: string;
  message: string;
}

/** Make a draft campaign. Returns its id. Creating never sends. */
export async function createCampaign(args: {
  senderId: string;
  subject: string;
  html: string;
  text: string;
  listIds: string[];
}): Promise<string> {
  const r = await my<{ id: string }>("/campaigns", {
    method: "POST",
    body: JSON.stringify({
      name: `${args.subject} (${new Date().toISOString().slice(0, 10)})`,
      sender_id: args.senderId,
      subject: args.subject,
      html: args.html,
      plain_text: args.text,
      list_ids: args.listIds,
    }),
  });
  if (r.status === 403) throw new Error("The Mailyte key needs the campaigns:write scope.");
  if (!r.data?.id) throw new Error(`Mailyte said ${r.status} when making the email.`);
  return r.data.id;
}

export async function preflight(id: string): Promise<{
  sendable: boolean;
  blockers: Blocker[];
  recipients: number;
  hasUnsub: boolean;
  tags: unknown;
}> {
  const r = await my<{
    sendable?: boolean;
    blockers?: Blocker[];
    recipient_count?: number;
    personalization?: { has_unsubscribe?: boolean; tags?: unknown };
  }>(`/campaigns/${id}/preflight`, { method: "POST" });
  return {
    sendable: !!r.data?.sendable,
    blockers: r.data?.blockers ?? [],
    recipients: r.data?.recipient_count ?? 0,
    hasUnsub: !!r.data?.personalization?.has_unsubscribe,
    tags: r.data?.personalization?.tags ?? null,
  };
}

/** What the editor's "Name" button inserts, and what Mailyte receives. */
export const NAME_TOKEN = "{{ first_name }}";
export const NAME_TAG = "{{ first_name | default('there') }}";

/**
 * Keep only the tags the editor makes, with no attributes except a link's
 * href (http, https or mailto). The message comes from the admin, but it is
 * mailed to every user, so nothing else is let through.
 */
export function cleanEmailHtml(html: string): string {
  const allowed = new Set(["p", "br", "strong", "b", "em", "i", "u", "s", "h2", "h3", "ul", "ol", "li", "a", "blockquote", "hr"]);
  return html
    .replace(/<(script|style|iframe|object|embed)[\s\S]*?<\/\1>/gi, "")
    .replace(/<\/?([a-z0-9]+)([^>]*)>/gi, (tag, name: string, rest: string) => {
      const n = name.toLowerCase();
      if (!allowed.has(n)) return "";
      if (tag.startsWith("</")) return `</${n}>`;
      if (n === "a") {
        const m = /href\s*=\s*"([^"]*)"/i.exec(rest);
        const href = m && /^(https?:|mailto:)/i.test(m[1].trim()) ? m[1].trim() : "";
        return href ? `<a href="${href}" style="color:#1b5faa">` : "<a>";
      }
      return `<${n}>`;
    });
}

export async function testSend(id: string, emails: string[]): Promise<{ sent: number; problems: string[] }> {
  const r = await my<{ sent?: number; results?: { email: string; status: string }[] }>(`/campaigns/${id}/test-send`, {
    method: "POST",
    body: JSON.stringify({ emails }),
  });
  if (r.status >= 400) throw new Error(`Mailyte said ${r.status} when sending the test.`);
  return {
    sent: r.data?.sent ?? 0,
    problems: (r.data?.results ?? []).filter((x) => x.status !== "sent").map((x) => `${x.email}: ${x.status}`),
  };
}

export async function sendCampaign(id: string): Promise<void> {
  const r = await my(`/campaigns/${id}/send`, { method: "POST" });
  if (r.status >= 400) throw new Error(`Mailyte refused to send (${r.status}).`);
}

/** Delete a campaign. Returns false if Mailyte refused (never throws, so the
 *  draft clean-up after a test can never turn a good test into an error). */
export async function deleteCampaign(id: string): Promise<boolean> {
  const r = await my(`/campaigns/${id}`, { method: "DELETE" });
  return r.status < 400;
}

/**
 * One sent email, ready to be edited as a NEW email in the composer. A sent
 * email cannot be changed (it is already in people's inboxes), so "Edit" opens
 * a copy. The GluFloat frame added by `emailHtml()` is taken off, and the
 * name tag is turned back into the editor's Name token.
 * The field names are read defensively: Mailyte's list endpoint nests the
 * subject under `content`, so the single endpoint is read the same way first.
 */
export async function getCampaignForEdit(
  id: string,
): Promise<{ subject: string; html: string; senderId: string | null } | null> {
  const r = await my<{
    subject?: string;
    html?: string;
    sender_id?: string;
    sender?: { id?: string };
    content?: { subject?: string; html?: string; sender_id?: string };
  }>(`/campaigns/${id}`);
  const d = r.data;
  if (r.status >= 400 || !d) return null;
  const subject = d.content?.subject ?? d.subject ?? "";
  const full = d.content?.html ?? d.html ?? "";
  if (!full) return null;
  return {
    subject,
    html: bodyOfEmail(full).split(NAME_TAG).join(NAME_TOKEN),
    senderId: d.sender_id ?? d.content?.sender_id ?? d.sender?.id ?? null,
  };
}

/** The message inside the frame `emailHtml()` puts round every email. */
export function bodyOfEmail(full: string): string {
  const start = full.indexOf('<td style="padding:24px;font-size:16px;line-height:1.6">');
  if (start < 0) return full;
  const from = full.indexOf(">", start) + 1;
  const end = full.indexOf('</td></tr>\n<tr><td style="padding:16px 24px 24px', from);
  return (end > from ? full.slice(from, end) : full.slice(from)).trim();
}

/** The list ids for these kinds of people. */
export async function listIdsFor(keys: (keyof typeof GROUP_NAME)[]): Promise<string[]> {
  const lists = await ensureLists();
  return keys.map((k) => lists[GROUP_NAME[k]]).filter(Boolean);
}

export interface SentEmail {
  id: string;
  subject: string;
  state: string;
  when: string;
  sent: number | null;
  opened: number | null;
  clicked: number | null;
}

/** The last few emails, with how many were sent and opened. */
export async function recentCampaigns(limit = 10): Promise<SentEmail[]> {
  const r = await my<{
    data?: { id: string; name: string; state: string; content?: { subject?: string | null }; created_at: string }[];
  }>(`/campaigns?per_page=${limit}`);
  const rows = (r.data?.data ?? []).filter((c) => c.state !== "draft").slice(0, limit);
  return Promise.all(
    rows.map(async (c) => {
      const s = await my<{ recipients?: { sent?: number | null }; engagement?: { opened?: number | null; clicked?: number | null } }>(
        `/campaigns/${c.id}/stats`,
      );
      return {
        id: c.id,
        subject: c.content?.subject ?? c.name,
        state: c.state,
        when: c.created_at,
        sent: s.data?.recipients?.sent ?? null,
        opened: s.data?.engagement?.opened ?? null,
        clicked: s.data?.engagement?.clicked ?? null,
      };
    }),
  );
}
