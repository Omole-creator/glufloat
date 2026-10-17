import { NextResponse } from "next/server";
import { staffContext } from "@/lib/hospitalServer";
import { isPatientPays, parsePatientPrice } from "@/lib/patientPays";

export const dynamic = "force-dynamic";

/**
 * A dietitian sets her monthly price per patient (patient-pays-schema.sql).
 * At least N4,500. A new price applies from each patient's NEXT payment;
 * nobody's current month changes.
 */
export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const ctx = await staffContext(typeof body.hid === "string" ? body.hid : null);
  if (!ctx) return NextResponse.json({ error: "Please log in again." }, { status: 401 });
  if (!isPatientPays(ctx.hospital) || ctx.staff.role !== "admin")
    return NextResponse.json({ error: "Only the dietitian can change this." }, { status: 403 });
  const r = parsePatientPrice(body.price);
  if ("error" in r) return NextResponse.json({ error: r.error }, { status: 400 });
  const { error } = await ctx.admin
    .from("hospitals")
    .update({ patient_price: r.price, updated_at: new Date().toISOString() })
    .eq("id", ctx.hospital.id);
  if (error) return NextResponse.json({ error: "This is not ready yet. Please try again later." }, { status: 503 });
  return NextResponse.json({ ok: true, price: r.price });
}
