import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/adminSession";
import { createAdminClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * Switch a GluFloat doctor off (an MDCN number that does not check out, or
 * any other reason), or back on. Off: status 'declined', so their dashboard
 * closes, their patients' links stop, and no care fee is earned. Their
 * patients keep their own accounts and plans. Nothing is approved by hand to
 * begin with (founder, 2026-10-16); this is only the way to stop one.
 */
export async function PATCH(request: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Not allowed" }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  const id = String(body.id ?? "");
  const action = String(body.action ?? "");
  const admin = createAdminClient();
  const { data: d } = await admin.from("hospitals").select("id,kind").eq("id", id).maybeSingle();
  if (!d || d.kind !== "doctor") return NextResponse.json({ error: "No such doctor." }, { status: 404 });
  if (action !== "on" && action !== "off") return NextResponse.json({ error: "Unknown action." }, { status: 400 });
  await admin
    .from("hospitals")
    .update({ status: action === "on" ? "active" : "declined", updated_at: new Date().toISOString() })
    .eq("id", id);
  return NextResponse.json({ ok: true });
}
