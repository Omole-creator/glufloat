import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/adminSession";
import { createAdminClient } from "@/lib/supabase/server";
import { PILOT_DAYS, PILOT_SEATS } from "@/lib/hospitalPlans";
import { newCode, readableToken, restoreCarried, type PatientRow } from "@/lib/hospitalServer";
import { normalizePhone } from "@/lib/phone";

export const dynamic = "force-dynamic";

const INVITE_DAYS = 14;

/**
 * GluFloat's own hands on a hospital (founder: hospitals are approved by hand).
 *
 *   approve  a request becomes a free 30-day pilot for 20 patients, and the
 *            contact gets a link to set up their admin login.
 *   decline  a request we will not take.
 *   end      switch a hospital off now. Its patients fall back to their own
 *            trial or plan; their records stay theirs.
 *   invite   a fresh admin link (the last one expired, or went to the wrong person).
 *   edit     fix the name or contact details.
 */
export async function PATCH(request: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Not allowed" }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  const id = String(body.id ?? "");
  const action = String(body.action ?? "");
  const admin = createAdminClient();
  const { data: h } = await admin.from("hospitals").select("*").eq("id", id).maybeSingle();
  if (!h) return NextResponse.json({ error: "No such hospital." }, { status: 404 });
  const now = new Date();

  const makeInvite = async () => {
    // e.g. /hospital/join/lagoonhospital42-k7m3qp (founder's choice)
    const token = readableToken(h.name as string, false);
    const { error } = await admin.from("hospital_invites").insert({
      token,
      hospital_id: id,
      role: "admin",
      name: h.contact_name,
      phone: h.contact_phone,
      email: h.contact_email,
      expires_at: new Date(now.getTime() + INVITE_DAYS * 86400000).toISOString(),
    });
    return error ? null : token;
  };

  if (action === "approve") {
    if (h.status !== "requested") return NextResponse.json({ error: "Only a new request can be approved." }, { status: 400 });
    await admin
      .from("hospitals")
      .update({
        status: "pilot",
        plan: "pilot",
        seats: PILOT_SEATS,
        access_until: new Date(now.getTime() + PILOT_DAYS * 86400000).toISOString(),
        approved_at: now.toISOString(),
        updated_at: now.toISOString(),
      })
      .eq("id", id);
    return NextResponse.json({ ok: true, token: await makeInvite() });
  }
  if (action === "decline") {
    await admin.from("hospitals").update({ status: "declined", updated_at: now.toISOString() }).eq("id", id);
    return NextResponse.json({ ok: true });
  }
  if (action === "end") {
    await admin.from("hospitals").update({ status: "ended", updated_at: now.toISOString() }).eq("id", id);
    return NextResponse.json({ ok: true });
  }
  if (action === "invite") {
    return NextResponse.json({ ok: true, token: await makeInvite() });
  }
  if (action === "edit") {
    const clip = (v: unknown, n = 200) => (v === undefined ? undefined : String(v ?? "").trim().slice(0, n) || null);
    const patch: Record<string, unknown> = { updated_at: now.toISOString() };
    for (const [k, n] of [
      ["name", 200],
      ["contact_name", 120],
      ["contact_role", 80],
      ["contact_phone", 40],
      ["contact_email", 200],
      ["city", 80],
      ["state", 80],
    ] as const) {
      const v = clip(body[k], n);
      if (v !== undefined) patch[k] = v;
    }
    if (patch.name === null) return NextResponse.json({ error: "The hospital needs a name." }, { status: 400 });
    // The plan itself, set by hand (e.g. a Care Custom hospital with 350 places).
    if (body.plan !== undefined) {
      if (!["pilot", "care50", "care100", "care200", "custom"].includes(String(body.plan)))
        return NextResponse.json({ error: "Pick a plan." }, { status: 400 });
      patch.plan = body.plan;
    }
    if (body.seats !== undefined) {
      const seats = Number.parseInt(String(body.seats), 10);
      if (!Number.isFinite(seats) || seats < 0 || seats > 100000)
        return NextResponse.json({ error: "Places must be a number." }, { status: 400 });
      patch.seats = seats;
    }
    if (body.status !== undefined) {
      if (!["pilot", "active", "ended"].includes(String(body.status)))
        return NextResponse.json({ error: "Pick a status." }, { status: 400 });
      patch.status = body.status;
    }
    if (body.accessUntil !== undefined) {
      const d = /^\d{4}-\d{2}-\d{2}$/.test(String(body.accessUntil)) ? new Date(`${body.accessUntil}T23:59:00+01:00`) : null;
      if (!d || Number.isNaN(d.getTime())) return NextResponse.json({ error: "Pick a real date." }, { status: 400 });
      patch.access_until = d.toISOString();
    }
    await admin.from("hospitals").update(patch).eq("id", id);
    return NextResponse.json({ ok: true });
  }
  return NextResponse.json({ error: "Unknown action." }, { status: 400 });
}

/**
 * Add a hospital by hand (founder, 2026-10-12): one met offline, or one that
 * goes straight to a paid plan. It starts as a request, so the founder can
 * approve a pilot OR make its quote/invoice straight away on its own page.
 */
export async function POST(request: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Not allowed" }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  const clip = (v: unknown, n = 200) => String(v ?? "").trim().slice(0, n) || null;
  const name = clip(body.name);
  if (!name) return NextResponse.json({ error: "Put the hospital's name." }, { status: 400 });
  const admin = createAdminClient();
  for (let attempt = 0; attempt < 4; attempt++) {
    const { data, error } = await admin
      .from("hospitals")
      .insert({
        code: newCode(),
        name,
        contact_name: clip(body.contact_name, 120),
        contact_phone: normalizePhone(clip(body.contact_phone, 40)) || null,
        contact_email: clip(body.contact_email, 200)?.toLowerCase() ?? null,
        city: clip(body.city, 80),
        state: clip(body.state, 80),
        status: "requested",
        message: "Added by GluFloat admin.",
      })
      .select("id")
      .single();
    if (!error) return NextResponse.json({ ok: true, id: data.id });
    if (!/duplicate|unique/i.test(error.message)) return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json({ error: "Please try again." }, { status: 503 });
}

/**
 * Delete a hospital for good (founder: some will try the pilot and not go on).
 * Its staff list, invites, patient list and quotes/invoices go with it. The
 * patients' and staff's OWN GluFloat accounts and records are untouched, and a
 * patient who brought paid days gets them back first. Money already received
 * stays on /admin/finance, because it really was received.
 */
export async function DELETE(request: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Not allowed" }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  const id = String(body.id ?? "");
  const admin = createAdminClient();
  const { data: h } = await admin.from("hospitals").select("id,name").eq("id", id).maybeSingle();
  if (!h) return NextResponse.json({ error: "No such hospital." }, { status: 404 });
  if (String(body.confirmName ?? "").trim().toLowerCase() !== String(h.name).trim().toLowerCase())
    return NextResponse.json({ error: "Type the hospital's name exactly to delete it." }, { status: 400 });

  const { data: pats } = await admin.from("hospital_patients").select("*").eq("hospital_id", id);
  for (const p of (pats ?? []) as PatientRow[]) await restoreCarried(admin, p);
  const { error } = await admin.from("hospitals").delete().eq("id", id);
  if (error) return NextResponse.json({ error: "Could not delete it. Please try again." }, { status: 503 });
  return NextResponse.json({ ok: true });
}
