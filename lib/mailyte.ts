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
 * What this file does: put each person who said YES (profiles.email_updates)
 * on one Mailyte contact list by who they are, and mark people who said no as
 * unsubscribed. The emails are written and sent as campaigns in Mailyte,
 * which adds the unsubscribe link the law needs.
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
  emailUpdates: boolean | null;
  /** When they said yes, kept on the Mailyte contact as the consent record. */
  consentedAt: string | null;
}

export interface SyncResult {
  sent: number;
  stopped: number;
  failed: number;
  byGroup: Record<string, number>;
}

const listKey = (t: string | null) => (t && isUserType(t) ? t : "unset");

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
 * Send the list. Yes → put on their list (and off the other GluFloat lists,
 * so somebody whose kind was corrected on /admin/users moves across). No →
 * marked unsubscribed. Never asked → not sent.
 *
 * A yes uses `status_if_new`, never `status`: somebody who pressed
 * "unsubscribe" in one of our emails stays unsubscribed even though the app
 * still says yes. Mailyte's own docs call overriding that the worst thing the
 * API can do.
 */
export async function syncContacts(contacts: Contact[]): Promise<SyncResult> {
  const lists = await ensureLists();
  const ours = new Set(Object.values(lists));
  const out: SyncResult = { sent: 0, stopped: 0, failed: 0, byGroup: {} };

  await eachLimited(contacts, async (c) => {
    if (c.emailUpdates === true) {
      const name = GROUP_NAME[listKey(c.userType)];
      const target = lists[name];
      const r = await my<ContactRow>("/contacts", {
        method: "PUT",
        body: JSON.stringify({
          email: c.email,
          name: c.name ?? undefined,
          status_if_new: "subscribed",
          list_ids: [target],
          source: "GluFloat app",
          consented_at: c.consentedAt ?? undefined,
          consent_source: "GluFloat app, My details: Get GluFloat tips by email",
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
    } else if (c.emailUpdates === false) {
      const r = await my("/contacts", {
        method: "PUT",
        body: JSON.stringify({ email: c.email, status: "unsubscribed" }),
      });
      if (r.status >= 400) out.failed += 1;
      else out.stopped += 1;
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
      status_if_new: "subscribed",
      list_ids: [lists[GROUP_NAME[group]]],
      source: "GluFloat admin",
      consented_at: new Date().toISOString(),
      consent_source: "Added by GluFloat admin: they told us they want our emails",
    }),
  });
  if (r.status === 422) throw new Error("Mailyte did not accept that email address.");
  if (r.status >= 400) throw new Error(`Mailyte said ${r.status}.`);
}
