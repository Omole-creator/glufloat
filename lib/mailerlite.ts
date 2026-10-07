import { isUserType, type UserType } from "./userType";

/**
 * Sending GluFloat's emails through MailerLite. Server only.
 *
 * GluFloat's own address (ImprovMX, free) can only RECEIVE. That is fine:
 * MailerLite sends from its own servers. It only needs (1) the sender address
 * confirmed, which works because ImprovMX forwards MailerLite's confirmation
 * email to the founder's inbox, and (2) the glufloat.com domain authenticated
 * with the DNS records MailerLite gives. See supabase/SETUP.md §5.
 *
 * What this file does: put each person who said YES (profiles.email_updates)
 * into one MailerLite group by who they are, and mark people who said no as
 * unsubscribed. The emails themselves are written and sent in MailerLite,
 * which carries the unsubscribe link the law needs.
 *
 * Needs MAILERLITE_API_KEY (MailerLite > Integrations > API). Server-only env
 * var, never NEXT_PUBLIC.
 */

const API = "https://connect.mailerlite.com/api";

/** One MailerLite group per kind of person. Changing a name makes a new group. */
export const GROUP_NAME: Record<UserType | "unset", string> = {
  diabetic: "GluFloat: Diabetic",
  health_pro: "GluFloat: Health professional",
  caregiver: "GluFloat: Caregiver",
  unset: "GluFloat: Not set",
};

export function mailerliteConfigured(): boolean {
  return !!process.env.MAILERLITE_API_KEY;
}

async function ml(path: string, init: RequestInit = {}): Promise<Response> {
  return fetch(`${API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${process.env.MAILERLITE_API_KEY}`,
      "Content-Type": "application/json",
      Accept: "application/json",
      ...(init.headers ?? {}),
    },
    cache: "no-store",
  });
}

/** The four groups, created if missing. Name → id. */
async function ensureGroups(): Promise<Record<string, string>> {
  const res = await ml(`/groups?limit=100&filter[name]=${encodeURIComponent("GluFloat:")}`);
  if (!res.ok) throw new Error(res.status === 401 ? "The MailerLite key is wrong." : `MailerLite said ${res.status}.`);
  const body = (await res.json()) as { data?: { id: string; name: string }[] };
  const ids: Record<string, string> = {};
  for (const g of body.data ?? []) ids[g.name] = g.id;
  for (const name of Object.values(GROUP_NAME)) {
    if (ids[name]) continue;
    const made = await ml("/groups", { method: "POST", body: JSON.stringify({ name }) });
    if (!made.ok) throw new Error(`Could not make the group "${name}" (${made.status}).`);
    ids[name] = ((await made.json()) as { data: { id: string } }).data.id;
  }
  return ids;
}

type BatchReq = { method: string; path: string; body?: unknown };
type BatchRes = { code: number; body?: { data?: { id?: string; groups?: { id: string }[] } } };

async function batch(requests: BatchReq[]): Promise<BatchRes[]> {
  const out: BatchRes[] = [];
  // 50 calls per batch is MailerLite's limit.
  for (let i = 0; i < requests.length; i += 50) {
    const res = await ml("/batch", { method: "POST", body: JSON.stringify({ requests: requests.slice(i, i + 50) }) });
    if (res.status === 429) throw new Error("MailerLite says slow down. Wait one minute and press the button again.");
    if (!res.ok) throw new Error(`MailerLite said ${res.status}.`);
    out.push(...(((await res.json()) as { responses?: BatchRes[] }).responses ?? []));
  }
  return out;
}

export interface Contact {
  email: string;
  name: string | null;
  userType: string | null;
  emailUpdates: boolean | null;
}

export interface SyncResult {
  sent: number;
  stopped: number;
  failed: number;
  byGroup: Record<string, number>;
}

/**
 * Send the list. People who said yes are added (or updated) in their group
 * and taken out of the other GluFloat groups, so somebody whose kind was
 * corrected on /admin/users moves across. People who said no are marked
 * unsubscribed. People never asked are not sent at all.
 */
export async function syncContacts(contacts: Contact[]): Promise<SyncResult> {
  const groups = await ensureGroups();
  const ourGroupIds = new Set(Object.values(groups));
  const yes = contacts.filter((c) => c.emailUpdates === true);
  const no = contacts.filter((c) => c.emailUpdates === false);
  const byGroup: Record<string, number> = {};

  const targetOf = (c: Contact) => GROUP_NAME[c.userType && isUserType(c.userType) ? c.userType : "unset"];

  const upserts: BatchReq[] = yes.map((c) => {
    const g = targetOf(c);
    byGroup[g] = (byGroup[g] ?? 0) + 1;
    return {
      method: "POST",
      path: "api/subscribers",
      body: { email: c.email, fields: { name: c.name ?? "" }, groups: [groups[g]], status: "active" },
    };
  });
  const stops: BatchReq[] = no.map((c) => ({
    method: "POST",
    path: "api/subscribers",
    body: { email: c.email, status: "unsubscribed" },
  }));

  const upsertRes = await batch(upserts);
  const stopRes = stops.length ? await batch(stops) : [];
  const ok = (r: BatchRes) => r.code >= 200 && r.code < 300;

  // Take each person out of any OTHER GluFloat group they were in before.
  const moves: BatchReq[] = [];
  upsertRes.forEach((r, i) => {
    const id = r.body?.data?.id;
    if (!ok(r) || !id) return;
    const target = groups[targetOf(yes[i])];
    for (const g of r.body?.data?.groups ?? []) {
      if (g.id !== target && ourGroupIds.has(g.id)) {
        moves.push({ method: "DELETE", path: `api/subscribers/${id}/groups/${g.id}` });
      }
    }
  });
  if (moves.length) await batch(moves);

  return {
    sent: upsertRes.filter(ok).length,
    stopped: stopRes.filter(ok).length,
    failed: upsertRes.filter((r) => !ok(r)).length + stopRes.filter((r) => !ok(r)).length,
    byGroup,
  };
}

/** Add or update one person in one group (the admin's "Add a contact" form). */
export async function addContact(email: string, name: string, group: keyof typeof GROUP_NAME): Promise<void> {
  const groups = await ensureGroups();
  const res = await ml("/subscribers", {
    method: "POST",
    body: JSON.stringify({ email, fields: { name }, groups: [groups[GROUP_NAME[group]]], status: "active" }),
  });
  if (res.status === 422) throw new Error("MailerLite did not accept that email address.");
  if (!res.ok) throw new Error(`MailerLite said ${res.status}.`);
}
