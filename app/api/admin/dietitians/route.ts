import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/adminSession";
import { createAdminClient } from "@/lib/supabase/server";
import { normalizePhone } from "@/lib/phone";
import { parsePatientPrice } from "@/lib/patientPays";

export const dynamic = "force-dynamic";

/**
 * GluFloat's own hands on a dietitian's practice (founder, 2026-10-13: she
 * signs up herself, we check her DCN number afterwards).
 *
 *   off  her DCN number did not check out. Status 'declined': her dashboard
 *        closes (staffContext skips declined), her patients fall back to their
 *        own trial or plan with any paid days they brought given back
 *        (hospitalStatusFor), and a payment cannot reopen it
 *        (lib/practicePayment.ts skips declined).
 *   on   undo that. Paying again is what moves a plan's end date; this only
 *        lifts the switch.
 *   edit fix her details: { name, phone, email, dcn, price } (price in naira,
 *        at least N4,500, patient-pays-schema.sql; it applies from each
 *        patient's next payment).
 */
export async function PATCH(request: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Not allowed" }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  const id = String(body.id ?? "");
  const action = String(body.action ?? "");
  const admin = createAdminClient();
  const { data: p } = await admin.from("hospitals").select("id,kind,plan").eq("id", id).maybeSingle();
  if (!p || p.kind !== "dietitian") return NextResponse.json({ error: "No such dietitian." }, { status: 404 });

  const now = new Date().toISOString();
  if (action === "off") {
    await admin.from("hospitals").update({ status: "declined", updated_at: now }).eq("id", id);
    return NextResponse.json({ ok: true });
  }
  if (action === "on") {
    const paid = typeof p.plan === "string" && (p.plan.startsWith("diet") || p.plan === "patient_pays");
    await admin.from("hospitals").update({ status: paid ? "active" : "pilot", updated_at: now }).eq("id", id);
    return NextResponse.json({ ok: true });
  }
  if (action === "edit") {
    const clip = (v: unknown, n = 200) => String(v ?? "").trim().slice(0, n);
    const name = clip(body.name, 120);
    const phone = normalizePhone(clip(body.phone, 40));
    const email = clip(body.email, 200).toLowerCase();
    const dcn = clip(body.dcn, 40).toUpperCase();
    if (!name) return NextResponse.json({ error: "Please put her name." }, { status: 400 });
    if (phone && phone.length < 10) return NextResponse.json({ error: "The WhatsApp number is not complete." }, { status: 400 });
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return NextResponse.json({ error: "The email is not right." }, { status: 400 });
    const patch: Record<string, unknown> = {
      name,
      contact_name: name,
      contact_phone: phone || null,
      contact_email: email || null,
      dcn_number: dcn || null,
      updated_at: now,
    };
    if (body.price !== undefined && String(body.price).trim() !== "") {
      const r = parsePatientPrice(body.price);
      if ("error" in r) return NextResponse.json({ error: r.error }, { status: 400 });
      patch.patient_price = r.price;
    }
    const { error } = await admin.from("hospitals").update(patch).eq("id", id);
    if (error) return NextResponse.json({ error: "Could not save. Please try again." }, { status: 503 });
    // Her name on her own dashboard follows.
    await admin.from("hospital_staff").update({ name, phone: phone || null }).eq("hospital_id", id).eq("role", "admin");
    return NextResponse.json({ ok: true });
  }
  return NextResponse.json({ error: "Unknown action." }, { status: 400 });
}
