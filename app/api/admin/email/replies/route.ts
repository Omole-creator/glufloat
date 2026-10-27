import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { adminOrJob } from "@/lib/jobAuth";

export const dynamic = "force-dynamic";

/**
 * Replies to single emails sent from /admin/email (founder, 2026-10-27).
 * Callers: the reply-checking job (x-outreach-secret) and the admin screen.
 *
 * GET                       emails from the last 60 days with no reply yet,
 *                           for the job to look up in glufloat@gmail.com
 * PATCH { id, replied: true, reply_from?, reply_snippet?, replied_at? }
 *                           mark one as replied
 * PATCH { id, replied: false }   unmark it (admin, a wrong match)
 * PATCH { id, checked: true }    the job looked and found nothing
 */
const NOT_READY = { error: "Not ready yet. Run supabase/direct-email-replies-schema.sql (#37 in SETUP.md)." };
const clip = (v: unknown, n: number) => {
  const s = String(v ?? "").replace(/\s+/g, " ").trim().slice(0, n);
  return s || null;
};

export async function GET(request: Request) {
  if (!(await adminOrJob(request))) return NextResponse.json({ error: "Not allowed" }, { status: 401 });
  const since = new Date(Date.now() - 60 * 86_400_000).toISOString();
  const { data, error } = await createAdminClient()
    .from("direct_emails")
    .select("id, sent_at, from_email, to_name, to_email, cc, subject, replied_at, checked_at")
    .is("replied_at", null)
    .gte("sent_at", since)
    // Our own test emails to @glufloat.com never get a reply to look for.
    .not("to_email", "ilike", "%@glufloat.com")
    .order("sent_at", { ascending: false });
  if (error) return NextResponse.json(NOT_READY, { status: 503 });
  return NextResponse.json({ emails: data });
}

export async function PATCH(request: Request) {
  if (!(await adminOrJob(request))) return NextResponse.json({ error: "Not allowed" }, { status: 401 });
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const id = String(body.id ?? "");
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: "Unknown email." }, { status: 400 });

  let patch: Record<string, unknown>;
  if (body.replied === true) {
    const at = body.replied_at ? new Date(String(body.replied_at)) : new Date();
    patch = {
      replied_at: Number.isNaN(at.getTime()) ? new Date().toISOString() : at.toISOString(),
      reply_from: clip(body.reply_from, 200),
      reply_snippet: clip(body.reply_snippet, 400),
      checked_at: new Date().toISOString(),
    };
  } else if (body.replied === false) {
    patch = { replied_at: null, reply_from: null, reply_snippet: null };
  } else if (body.checked === true) {
    patch = { checked_at: new Date().toISOString() };
  } else return NextResponse.json({ error: "Nothing to change." }, { status: 400 });

  const { data, error } = await createAdminClient().from("direct_emails").update(patch).eq("id", id).select("id");
  if (error) return NextResponse.json(NOT_READY, { status: 503 });
  if (!data?.length) return NextResponse.json({ error: "Unknown email." }, { status: 404 });
  return NextResponse.json({ ok: true });
}
