import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/adminSession";
import { createAdminClient } from "@/lib/supabase/server";
import { isInternalEmail } from "@/lib/internalAccounts";
import { renderMarkdown, stripMarkdown } from "@/lib/markdown";
import {
  GROUP_NAME,
  UNSUB_HREF,
  createCampaign,
  deleteCampaign,
  emailHtml,
  listIdsFor,
  mailyteConfigured,
  preflight,
  sendCampaign,
  syncContacts,
  testSend,
  type Contact,
} from "@/lib/mailyte";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

type Body = {
  action?: "test" | "send";
  senderId?: string;
  subject?: string;
  body?: string;
  groups?: string[];
  testEmail?: string;
};

/**
 * Write and send an email from /admin/email, through a Mailyte campaign
 * (which carries the unsubscribe handling the law needs).
 *   test: a draft, one test copy to `testEmail`, then the draft is deleted.
 *   send: refresh the lists, make the campaign, preflight, send.
 * Preflight runs before every real send and its blockers are shown as-is, so
 * nothing goes out that Mailyte would refuse.
 */
export async function POST(request: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  if (!mailyteConfigured()) return NextResponse.json({ error: "Mailyte is not connected." }, { status: 400 });

  const b = (await request.json().catch(() => ({}))) as Body;
  const subject = String(b.subject ?? "").trim();
  const text = String(b.body ?? "").trim();
  const groups = (b.groups ?? []).filter((g): g is keyof typeof GROUP_NAME => g in GROUP_NAME);
  if (!b.senderId) return NextResponse.json({ error: "Pick who it is from." }, { status: 400 });
  if (!subject) return NextResponse.json({ error: "Write a subject." }, { status: 400 });
  if (!text) return NextResponse.json({ error: "Write the message." }, { status: 400 });
  if (b.action === "send" && groups.length === 0) {
    return NextResponse.json({ error: "Pick at least one list." }, { status: 400 });
  }

  const html = emailHtml(subject, renderMarkdown(text));
  const plain = `${stripMarkdown(text)}\n\n--\nYou get this email because you said yes to GluFloat emails.\nStop these emails: ${UNSUB_HREF}`;

  try {
    if (b.action === "test") {
      const to = String(b.testEmail ?? "").trim().toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
        return NextResponse.json({ error: "Type the email for the test." }, { status: 400 });
      }
      const listIds = await listIdsFor(groups.length ? groups : ["diabetic"]);
      const id = await createCampaign({ senderId: b.senderId, subject: `[Test] ${subject}`, html, text: plain, listIds });
      try {
        const r = await testSend(id, [to]);
        if (r.sent === 0) return NextResponse.json({ error: `The test did not go: ${r.problems.join(", ")}` }, { status: 502 });
        return NextResponse.json({ ok: true, message: `Test sent to ${to}.` });
      } finally {
        await deleteCampaign(id);
      }
    }

    // A real send: bring the lists up to date first, so today's yeses get it.
    const { data, error } = await createAdminClient()
      .from("profiles")
      .select("email,name,user_type,email_updates,email_updates_at");
    if (error) return NextResponse.json({ error: "Could not read the users." }, { status: 500 });
    const contacts: Contact[] = (data ?? [])
      .filter((p) => p.email && !isInternalEmail(p.email as string))
      .map((p) => ({
        email: String(p.email).trim().toLowerCase(),
        name: (p.name as string | null) ?? null,
        userType: (p.user_type as string | null) ?? null,
        emailUpdates: typeof p.email_updates === "boolean" ? p.email_updates : null,
        consentedAt: (p.email_updates_at as string | null) ?? null,
      }));
    await syncContacts(contacts);

    const id = await createCampaign({ senderId: b.senderId, subject, html, text: plain, listIds: await listIdsFor(groups) });
    const check = await preflight(id);
    if (!check.sendable) {
      await deleteCampaign(id);
      const why = check.blockers.map((x) => x.message).join(" ") || "Mailyte would not send it.";
      return NextResponse.json({ error: why, blockers: check.blockers }, { status: 422 });
    }
    await sendCampaign(id);
    return NextResponse.json({ ok: true, message: `Sending to ${check.recipients} ${check.recipients === 1 ? "person" : "people"}.` });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Something went wrong." }, { status: 502 });
  }
}
