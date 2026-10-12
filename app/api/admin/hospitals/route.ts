import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/adminSession";
import { createAdminClient } from "@/lib/supabase/server";
import { PILOT_DAYS, PILOT_SEATS } from "@/lib/hospitalPlans";
import { newToken } from "@/lib/hospitalServer";

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
    const token = newToken();
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
    await admin.from("hospitals").update(patch).eq("id", id);
    return NextResponse.json({ ok: true });
  }
  return NextResponse.json({ error: "Unknown action." }, { status: 400 });
}
