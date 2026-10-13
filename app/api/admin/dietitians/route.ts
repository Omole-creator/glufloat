import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/adminSession";
import { createAdminClient } from "@/lib/supabase/server";

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
    const paid = typeof p.plan === "string" && p.plan.startsWith("diet");
    await admin.from("hospitals").update({ status: paid ? "active" : "pilot", updated_at: now }).eq("id", id);
    return NextResponse.json({ ok: true });
  }
  return NextResponse.json({ error: "Unknown action." }, { status: 400 });
}
