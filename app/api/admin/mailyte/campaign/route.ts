import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/adminSession";
import { createAdminClient } from "@/lib/supabase/server";
import { isInternalEmail } from "@/lib/internalAccounts";
import {
  GROUP_NAME,
  NAME_TAG,
  NAME_TOKEN,
  UNSUB_HREF,
  cleanEmailHtml,
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
  action?: "test" | "send" | "check";
  senderId?: string;
  subject?: string;
  html?: string;
  groups?: string[];
  testEmail?: string;
};

/** The editor's HTML as plain text, for the plain-text part of the email. */
function toText(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|h2|h3|li|blockquote)>/gi, "\n\n")
    .replace(/<li>/gi, "- ")
    .replace(/<a href="([^"]+)"[^>]*>([^<]*)<\/a>/gi, "$2 ($1)")
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

/**
 * Write and send an email from /admin/email, through a Mailyte campaign
 * (which carries the unsubscribe handling the law needs).
 *   test: a draft, one test copy to `testEmail`, then the draft is deleted.
 *   send: refresh the lists, make the campaign, preflight, send.
 *   check: like send, but never sends; returns Mailyte's preflight and
 *          deletes the draft. Not in the UI; for checking the setup.
 * Preflight runs before every real send and its blockers are shown as-is, so
 * nothing goes out that Mailyte would refuse.
 */
export async function POST(request: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  if (!mailyteConfigured()) return NextResponse.json({ error: "Mailyte is not connected." }, { status: 400 });

  const b = (await request.json().catch(() => ({}))) as Body;
  if (b.action !== "test" && b.action !== "send" && b.action !== "check") {
    return NextResponse.json({ error: "Unknown action." }, { status: 400 });
  }
  const subject = String(b.subject ?? "").trim();
  const groups = (b.groups ?? []).filter((g): g is keyof typeof GROUP_NAME => g in GROUP_NAME);
  // The Name button puts NAME_TOKEN in the text; Mailyte gets NAME_TAG, which
  // reads "there" for anybody with no name.
  const message = cleanEmailHtml(String(b.html ?? "")).split(NAME_TOKEN).join(NAME_TAG);
  if (!b.senderId) return NextResponse.json({ error: "Pick who it is from." }, { status: 400 });
  if (!subject) return NextResponse.json({ error: "Write a subject." }, { status: 400 });
  if (!toText(message)) return NextResponse.json({ error: "Write the message." }, { status: 400 });
  if (b.action !== "test" && groups.length === 0) {
    return NextResponse.json({ error: "Pick at least one list." }, { status: 400 });
  }
  const subjectOut = subject.split(NAME_TOKEN).join(NAME_TAG);

  const html = emailHtml(subject, message);
  const plain = `${toText(message)}\n\n--\nGluFloat. www.glufloat.com\nStop these emails: ${UNSUB_HREF}`;

  try {
    if (b.action === "test") {
      const to = String(b.testEmail ?? "").trim().toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
        return NextResponse.json({ error: "Type the email for the test." }, { status: 400 });
      }
      const listIds = await listIdsFor(groups.length ? groups : ["diabetic"]);
      const id = await createCampaign({ senderId: b.senderId, subject: `[Test] ${subjectOut}`, html, text: plain, listIds });
      try {
        const r = await testSend(id, [to]);
        if (r.sent === 0) return NextResponse.json({ error: `The test did not go: ${r.problems.join(", ")}` }, { status: 502 });
        return NextResponse.json({ ok: true, message: `Test sent to ${to}.` });
      } finally {
        await deleteCampaign(id);
      }
    }

    // A real send: bring the lists up to date first, so new users get it.
    const { data, error } = await createAdminClient().from("profiles").select("email,name,user_type");
    if (error) return NextResponse.json({ error: "Could not read the users." }, { status: 500 });
    const contacts: Contact[] = (data ?? [])
      .filter((p) => p.email && !isInternalEmail(p.email as string))
      .map((p) => ({
        email: String(p.email).trim().toLowerCase(),
        name: (p.name as string | null) ?? null,
        userType: (p.user_type as string | null) ?? null,
      }));
    await syncContacts(contacts);

    const id = await createCampaign({
      senderId: b.senderId,
      subject: subjectOut,
      html,
      text: plain,
      listIds: await listIdsFor(groups),
    });
    const check = await preflight(id);
    if (b.action === "check") {
      await deleteCampaign(id);
      return NextResponse.json({ ok: true, message: "Checked only. Nothing was sent.", ...check });
    }
    if (!check.sendable) {
      await deleteCampaign(id);
      const why = check.blockers.map((x) => x.message).join(" ") || "Mailyte would not send it.";
      return NextResponse.json({ error: why, blockers: check.blockers, tags: check.tags }, { status: 422 });
    }
    await sendCampaign(id);
    return NextResponse.json({ ok: true, message: `Sending to ${check.recipients} ${check.recipients === 1 ? "person" : "people"}.` });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Something went wrong." }, { status: 502 });
  }
}
