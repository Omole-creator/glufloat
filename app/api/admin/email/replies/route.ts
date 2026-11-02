import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { adminOrJob } from "@/lib/jobAuth";
import { byTime, gmailKey, normalizeMessageId, stripQuoted, waitingForUs } from "@/lib/emailThread";

export const dynamic = "force-dynamic";

/**
 * Replies to single emails sent from /admin/email (founder, 2026-10-27;
 * whole conversations since 2026-11-02, #39).
 * Callers: the reply-checking job (x-outreach-secret) and the admin screen.
 *
 * GET    every email from the last 60 days (our own @glufloat.com tests left
 *        out), each with known_ids: the Message-IDs already in its
 *        conversation. A reply is matched by its In-Reply-To / References
 *        containing one of them, and skipped if its own Message-ID is
 *        already there.
 * POST   { email_id, from_email, from_name?, at?, subject?, body_text,
 *          message_id, in_reply_to?, refs? }   save one reply (whole text)
 * PATCH  { id, replied: true, reply_from?, reply_snippet?, replied_at? }
 *                                  mark one as replied (no text)
 * PATCH  { id, replied: false }    unmark it (admin, a wrong match)
 * PATCH  { id, checked: true }     the job looked and found nothing
 * PATCH  { id, done: true|false }  "No answer needed" (admin), or undo it
 */
const NOT_READY = { error: "Not ready yet. Run supabase/direct-email-replies-schema.sql (#37 in SETUP.md)." };
const THREAD_NOT_READY = { error: "Not ready yet. Run supabase/direct-email-thread-schema.sql (#39 in SETUP.md)." };
const clip = (v: unknown, n: number) => {
  const s = String(v ?? "").replace(/\s+/g, " ").trim().slice(0, n);
  return s || null;
};

export async function GET(request: Request) {
  if (!(await adminOrJob(request))) return NextResponse.json({ error: "Not allowed" }, { status: 401 });
  const since = new Date(Date.now() - 60 * 86_400_000).toISOString();
  const db = createAdminClient();
  const read = (cols: string) =>
    db
      .from("direct_emails")
      .select(cols)
      .gte("sent_at", since)
      // Our own test emails to @glufloat.com never get a reply to look for.
      .not("to_email", "ilike", "%@glufloat.com")
      .order("sent_at", { ascending: false });
  const cols = "id, sent_at, from_email, to_name, to_email, cc, subject, message_id, replied_at, checked_at";
  // done_at comes with #39; before it runs, read without it.
  let { data, error } = await read(`${cols}, done_at`);
  if (error) ({ data, error } = await read(cols));
  if (error) return NextResponse.json(NOT_READY, { status: 503 });
  const emails = (data ?? []) as unknown as {
    id: string;
    to_email: string;
    cc: string | null;
    message_id: string | null;
    replied_at: string | null;
    done_at?: string | null;
  }[];

  const { data: msgs, error: tErr } = await db
    .from("direct_email_messages")
    .select("email_id, direction, at, from_email, message_id")
    .in("email_id", emails.map((e) => e.id).length ? emails.map((e) => e.id) : ["00000000-0000-0000-0000-000000000000"]);
  const threadReady = !tErr;
  const byEmail = new Map<string, { direction: "in" | "out"; at: string; from_email: string | null; message_id: string | null }[]>();
  for (const m of msgs ?? []) {
    const list = byEmail.get(m.email_id) ?? [];
    list.push(m);
    byEmail.set(m.email_id, list);
  }

  return NextResponse.json({
    thread_ready: threadReady,
    emails: emails.map((e) => {
      const thread = (byEmail.get(e.id) ?? []).sort(byTime);
      const known = [e.message_id, ...thread.map((m) => m.message_id)].filter((id): id is string => !!id);
      return {
        ...e,
        // Everything already in this conversation: Message-IDs, and
        // "gmail:<id>" for replies saved by their Gmail id. Skip a reply
        // whose Gmail id is already here.
        known_ids: [...new Set(known)],
        people: [...new Set([e.to_email, ...String(e.cc ?? "").split(/[,;\s]+/), ...thread.map((m) => m.from_email)]
          .map((s) => String(s ?? "").trim().toLowerCase())
          .filter((s) => s && !s.endsWith("@glufloat.com")))],
        replies: thread.filter((m) => m.direction === "in").length,
        waiting_for_us: thread.length ? waitingForUs(thread, e.done_at) : !!e.replied_at && !e.done_at,
      };
    }),
  });
}

export async function POST(request: Request) {
  if (!(await adminOrJob(request))) return NextResponse.json({ error: "Not allowed" }, { status: 401 });
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const emailId = String(body.email_id ?? "");
  if (!/^[0-9a-f-]{36}$/i.test(emailId)) return NextResponse.json({ error: "Unknown email." }, { status: 400 });
  // The reply's own Message-ID when the job has it, else its Gmail id.
  const gmailId = String(body.gmail_id ?? "").trim();
  const messageId =
    normalizeMessageId(String(body.message_id ?? "")) ?? (/^[0-9a-z]{6,40}$/i.test(gmailId) ? gmailKey(gmailId) : null);
  if (!messageId) return NextResponse.json({ error: "Send the reply's gmail_id (or its Message-ID)." }, { status: 400 });
  const text = stripQuoted(String(body.body_text ?? "")).slice(0, 20000);
  if (!text.trim()) return NextResponse.json({ error: "Send the reply's text." }, { status: 400 });
  const at = body.at ? new Date(String(body.at)) : new Date();
  const atIso = Number.isNaN(at.getTime()) ? new Date().toISOString() : at.toISOString();
  const from = clip(body.from_email, 200)?.toLowerCase() ?? null;

  const db = createAdminClient();
  const { data: email } = await db.from("direct_emails").select("id, replied_at").eq("id", emailId).maybeSingle();
  if (!email) return NextResponse.json({ error: "Unknown email." }, { status: 404 });

  const { data: had, error: readErr } = await db.from("direct_email_messages").select("id").eq("message_id", messageId).limit(1);
  if (readErr) return NextResponse.json(THREAD_NOT_READY, { status: 503 });
  const duplicate = !!had?.length;
  if (!duplicate) {
    const { error } = await db.from("direct_email_messages").insert({
      email_id: emailId,
      direction: "in",
      at: atIso,
      from_email: from,
      from_name: clip(body.from_name, 200),
      subject: clip(body.subject, 300),
      body_text: text,
      message_id: messageId,
      in_reply_to: clip(body.in_reply_to, 300),
      refs: clip(body.refs, 4000),
    });
    // Two job runs at once: the unique Message-ID stops the second copy.
    if (error && !/duplicate|unique/i.test(error.message)) return NextResponse.json({ error: "Could not save it. Try again." }, { status: 500 });
  }

  // The older "Replied" mark (#37) follows the newest reply.
  if (!email.replied_at || new Date(email.replied_at) <= new Date(atIso)) {
    await db
      .from("direct_emails")
      .update({
        replied_at: atIso,
        reply_from: clip(body.from_name ? `${body.from_name} <${from}>` : from, 200),
        reply_snippet: clip(text, 400),
        checked_at: new Date().toISOString(),
      })
      .eq("id", emailId);
  }
  return NextResponse.json({ ok: true, duplicate });
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
  } else if (typeof body.done === "boolean") {
    patch = { done_at: body.done ? new Date().toISOString() : null };
  } else return NextResponse.json({ error: "Nothing to change." }, { status: 400 });

  const { data, error } = await createAdminClient().from("direct_emails").update(patch).eq("id", id).select("id");
  if (error) return NextResponse.json(NOT_READY, { status: 503 });
  if (!data?.length) return NextResponse.json({ error: "Unknown email." }, { status: 404 });
  return NextResponse.json({ ok: true });
}
