import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/adminSession";
import { createAdminClient } from "@/lib/supabase/server";
import { canEmail, nextDue, OUTREACH_STEPS, STATUSES, type Creator, type OutreachStatus, type SentEmail } from "@/lib/creatorOutreach";

export const dynamic = "force-dynamic";

/**
 * Creators we have emailed about the partnership (founder, 2026-10-26).
 *
 * Two callers: the admin screen (cookie) and the scheduled email job, which
 * sends the header `x-outreach-secret: <CREATOR_OUTREACH_SECRET>`.
 *
 * GET                         every creator (the job reads who is due)
 * POST  { name, email, ... , sent: { step, subject, sent_at, message_id } }
 *                             records an email sent; creates the creator on
 *                             the first one. Refused (409) once a creator is
 *                             not "emailing", so nobody who said stop is
 *                             written to again.
 * PATCH { id | email, status?, reply_summary?, notes?, name?, platform?, handle? }
 * DELETE { id }               admin only
 */
async function allowed(request: Request): Promise<"admin" | "job" | null> {
  if (await isAdmin()) return "admin";
  const secret = process.env.CREATOR_OUTREACH_SECRET;
  const given = request.headers.get("x-outreach-secret");
  if (!secret || !given) return null;
  const a = Buffer.from(secret);
  const b = Buffer.from(given);
  return a.length === b.length && timingSafeEqual(a, b) ? "job" : null;
}

const NOT_READY = { error: "Not ready yet. Run supabase/creator-outreach-schema.sql (#36 in SETUP.md)." };
const clip = (v: unknown, n: number) => {
  const s = String(v ?? "").trim().slice(0, n);
  return s || null;
};
const validEmail = (v: unknown) => {
  const e = String(v ?? "").trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e) ? e : null;
};

export async function GET(request: Request) {
  if (!(await allowed(request))) return NextResponse.json({ error: "Not allowed" }, { status: 401 });
  const { data, error } = await createAdminClient().from("creator_outreach").select("*").order("created_at", { ascending: false });
  if (error) return NextResponse.json(NOT_READY, { status: 503 });
  return NextResponse.json({ creators: data });
}

export async function POST(request: Request) {
  if (!(await allowed(request))) return NextResponse.json({ error: "Not allowed" }, { status: 401 });
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const email = validEmail(body.email);
  const name = clip(body.name, 160);
  const sent = (body.sent ?? null) as Record<string, unknown> | null;
  const step = Number(sent?.step);
  if (!email || !name) return NextResponse.json({ error: "Name and a valid email are needed." }, { status: 400 });
  if (!sent || !Number.isInteger(step) || step < 1 || step > OUTREACH_STEPS)
    return NextResponse.json({ error: "sent.step must be 1 to 5." }, { status: 400 });

  const admin = createAdminClient();
  const { data: found, error: readErr } = await admin.from("creator_outreach").select("*").eq("email", email).maybeSingle();
  if (readErr) return NextResponse.json(NOT_READY, { status: 503 });
  const existing = found as Creator | null;
  if (existing && !canEmail(existing.status))
    return NextResponse.json({ error: `This creator is "${existing.status}". Do not email them.` }, { status: 409 });

  const sentAt = clip(sent.sent_at, 40) ?? new Date().toISOString();
  const entry: SentEmail = { step, subject: clip(sent.subject, 300) ?? "", sent_at: sentAt, message_id: clip(sent.message_id, 100) };
  const emails = [...(existing?.emails ?? []).filter((e) => e.step !== step), entry].sort((a, b) => a.step - b.step);
  const firstSentAt = existing?.first_sent_at ?? sentAt;
  const done = Math.max(step, existing?.step ?? 0);
  const row = {
    name: existing?.name ?? name,
    email,
    platform: existing?.platform ?? clip(body.platform, 120),
    handle: existing?.handle ?? clip(body.handle, 200),
    research: clip(body.research, 2000) ?? existing?.research ?? null,
    thread_id: existing?.thread_id ?? clip(body.thread_id, 100),
    step: done,
    first_sent_at: firstSentAt,
    next_due_at: nextDue(firstSentAt, done),
    emails,
    updated_at: new Date().toISOString(),
  };
  const { error } = existing
    ? await admin.from("creator_outreach").update(row).eq("id", existing.id)
    : await admin.from("creator_outreach").insert(row);
  if (error) return NextResponse.json(NOT_READY, { status: 503 });
  return NextResponse.json({ ok: true, next_due_at: row.next_due_at });
}

export async function PATCH(request: Request) {
  if (!(await allowed(request))) return NextResponse.json({ error: "Not allowed" }, { status: 401 });
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (body.status !== undefined) {
    if (!STATUSES.includes(body.status as OutreachStatus)) return NextResponse.json({ error: "Unknown status." }, { status: 400 });
    update.status = body.status;
    // Out of the sequence: nothing more is due.
    if (body.status !== "emailing") update.next_due_at = null;
  }
  for (const [k, n] of [["reply_summary", 2000], ["notes", 2000], ["name", 160], ["platform", 120], ["handle", 200]] as const)
    if (body[k] !== undefined) update[k] = clip(body[k], n);
  if (update.name === null) return NextResponse.json({ error: "Please keep a name." }, { status: 400 });

  const admin = createAdminClient();
  let q = admin.from("creator_outreach").update(update);
  const email = validEmail(body.email);
  if (typeof body.id === "string" && body.id) q = q.eq("id", body.id);
  else if (email) q = q.eq("email", email);
  else return NextResponse.json({ error: "Say which creator (id or email)." }, { status: 400 });
  const { data, error } = await q.select("id");
  if (error) return NextResponse.json(NOT_READY, { status: 503 });
  if (!data?.length) return NextResponse.json({ error: "No such creator." }, { status: 404 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  if ((await allowed(request)) !== "admin") return NextResponse.json({ error: "Not allowed" }, { status: 401 });
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const id = String(body.id ?? "");
  if (!id) return NextResponse.json({ error: "Say which creator." }, { status: 400 });
  const { error } = await createAdminClient().from("creator_outreach").delete().eq("id", id);
  if (error) return NextResponse.json(NOT_READY, { status: 503 });
  return NextResponse.json({ ok: true });
}
