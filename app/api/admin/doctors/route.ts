import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/adminSession";
import { createAdminClient } from "@/lib/supabase/server";
import { doctorsReady } from "@/lib/careFeesServer";
import { restoreCarried, type PatientRow } from "@/lib/hospitalServer";
import { cleanDoctor, doctorByEmail, insertDoctorPractice, sendDoctorSetupLink } from "@/lib/doctorSignup";

export const dynamic = "force-dynamic";

/**
 * GluFloat's own hands on a doctor.
 *
 * POST   add a doctor by hand (founder, 2026-10-17: without a field agent).
 *        { name, email, mdcn, agentId? }. agentId credits a field agent or
 *        advisor exactly as if the doctor had opened their link; empty means
 *        nobody, so only the doctor earns. Opens at once, like a sign-up, and
 *        emails the set-up link; the link is also handed back so it can be
 *        sent on WhatsApp.
 * PATCH  { id, action }:
 *          off / on   switch off (an MDCN number that does not check out) or
 *                     back on. Off: status 'declined', dashboard closes, links
 *                     stop, no care fee is earned. Patients keep their accounts.
 *          edit       { name, email, mdcn }
 *          new_link   a fresh set-up link (the last one expired or was lost).
 * DELETE { id, confirmName } only a doctor with no money history: a care fee
 *        or payout would lose who it belonged to (the tables set it to null),
 *        so a doctor who has earned is switched off instead. Same rule the old
 *        partner programme kept.
 */
async function loadDoctor(admin: ReturnType<typeof createAdminClient>, id: string) {
  const { data } = await admin.from("hospitals").select("id,kind,name,contact_email").eq("id", id).maybeSingle();
  return data && data.kind === "doctor" ? data : null;
}

export async function POST(request: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Not allowed" }, { status: 401 });
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const c = cleanDoctor(body, "admin");
  if ("error" in c) return NextResponse.json({ error: c.error }, { status: 400 });
  const admin = createAdminClient();
  if (!(await doctorsReady(admin))) return NextResponse.json({ error: "Run doctors-schema.sql first." }, { status: 503 });
  if (await doctorByEmail(admin, c.email))
    return NextResponse.json({ error: "A doctor with this email is already on GluFloat. Use New set-up link on their row." }, { status: 409 });

  let agentId: string | null = null;
  if (typeof body.agentId === "string" && body.agentId) {
    const { data: a } = await admin.from("field_agents").select("id,status").eq("id", body.agentId).maybeSingle();
    if (!a || a.status !== "active") return NextResponse.json({ error: "Choose a doctor acquisition rep from the list, or Nobody." }, { status: 400 });
    agentId = a.id as string;
  }

  const id = await insertDoctorPractice(admin, { ...c, agentId, invitedBy: null });
  if (!id) return NextResponse.json({ error: "Could not add the doctor. Please try again." }, { status: 503 });
  const r = await sendDoctorSetupLink(admin, id, c.name, c.email);
  return NextResponse.json({ ok: true, id, emailed: r.emailed, link: r.link, name: c.name });
}

export async function PATCH(request: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Not allowed" }, { status: 401 });
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const id = String(body.id ?? "");
  const action = String(body.action ?? "");
  const admin = createAdminClient();
  const d = await loadDoctor(admin, id);
  if (!d) return NextResponse.json({ error: "No such doctor." }, { status: 404 });
  const now = new Date().toISOString();

  if (action === "on" || action === "off") {
    await admin
      .from("hospitals")
      .update({ status: action === "on" ? "active" : "declined", updated_at: now })
      .eq("id", id);
    return NextResponse.json({ ok: true });
  }
  if (action === "edit") {
    const c = cleanDoctor(body, "admin");
    if ("error" in c) return NextResponse.json({ error: c.error }, { status: 400 });
    const other = await doctorByEmail(admin, c.email);
    if (other && other !== id) return NextResponse.json({ error: "Another doctor already uses this email." }, { status: 409 });
    await admin
      .from("hospitals")
      .update({ name: c.name, contact_name: c.name, contact_email: c.email, mdcn_number: c.mdcn, updated_at: now })
      .eq("id", id);
    // Their name on their own dashboard follows.
    await admin.from("hospital_staff").update({ name: c.name }).eq("hospital_id", id).eq("role", "admin");
    return NextResponse.json({ ok: true });
  }
  if (action === "new_link") {
    if (!d.contact_email) return NextResponse.json({ error: "Add their email first." }, { status: 400 });
    const r = await sendDoctorSetupLink(admin, id, d.name as string, d.contact_email as string);
    if (!r.link) return NextResponse.json({ error: "Could not make a link. Please try again." }, { status: 503 });
    return NextResponse.json({ ok: true, emailed: r.emailed, link: r.link });
  }
  return NextResponse.json({ error: "Unknown action." }, { status: 400 });
}

export async function DELETE(request: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Not allowed" }, { status: 401 });
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const id = String(body.id ?? "");
  const admin = createAdminClient();
  const d = await loadDoctor(admin, id);
  if (!d) return NextResponse.json({ error: "No such doctor." }, { status: 404 });
  if (String(body.confirmName ?? "").trim().toLowerCase() !== String(d.name).trim().toLowerCase())
    return NextResponse.json({ error: "Type the doctor's name exactly to delete them." }, { status: 400 });

  const [earned, sourced, paid] = await Promise.all([
    admin.from("clinician_earnings").select("id", { count: "exact", head: true }).eq("hospital_id", id),
    admin.from("clinician_earnings").select("id", { count: "exact", head: true }).eq("source_hospital_id", id),
    admin.from("earning_payouts").select("id", { count: "exact", head: true }).eq("hospital_id", id),
  ]);
  if ((earned.count ?? 0) + (sourced.count ?? 0) + (paid.count ?? 0) > 0)
    return NextResponse.json(
      { error: "This doctor has care fees on record, so they cannot be deleted. Switch them off instead." },
      { status: 409 },
    );

  // A doctor's patients are linked, not covered, so nothing was carried in;
  // run it anyway, the same safe step every other practice delete takes.
  const { data: pats } = await admin.from("hospital_patients").select("*").eq("hospital_id", id);
  for (const p of (pats ?? []) as PatientRow[]) await restoreCarried(admin, p);
  const { error } = await admin.from("hospitals").delete().eq("id", id);
  if (error) return NextResponse.json({ error: "Could not delete. Please try again." }, { status: 503 });
  return NextResponse.json({ ok: true });
}
