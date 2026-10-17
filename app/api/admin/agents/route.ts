import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/adminSession";
import { createAdminClient } from "@/lib/supabase/server";
import { newToken, readableToken } from "@/lib/hospitalServer";
import { normalizePhone } from "@/lib/phone";

export const dynamic = "force-dynamic";

/**
 * Field agents and advisors, added by GluFloat (founder, 2026-10-16: they do
 * not sign up). Each gets two links:
 *   /d/<ref_code>     to give doctors (sign-up, credited to this agent)
 *   /agent/<token>    their own private dashboard (no login)
 *
 * POST  add one              { name, phone, email, role, managerId }
 * PATCH { id, action }       on | off | new_link (a fresh dashboard link, the
 *                            old one stops working) | edit { name, phone, email, managerId }
 */
function clean(body: Record<string, unknown>) {
  const clip = (v: unknown, n = 200) => String(v ?? "").trim().slice(0, n);
  const email = clip(body.email, 200).toLowerCase();
  return {
    name: clip(body.name, 120),
    phone: normalizePhone(clip(body.phone, 40)) || null,
    email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null,
    role: body.role === "advisor" ? ("advisor" as const) : ("agent" as const),
    managerId: typeof body.managerId === "string" && body.managerId ? body.managerId : null,
  };
}

async function validManager(admin: ReturnType<typeof createAdminClient>, id: string | null, self?: string): Promise<boolean> {
  if (!id) return true;
  if (id === self) return false;
  const { data } = await admin.from("field_agents").select("id,role").eq("id", id).maybeSingle();
  return !!data && data.role === "advisor";
}

export async function POST(request: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Not allowed" }, { status: 401 });
  const c = clean(await request.json().catch(() => ({})));
  if (!c.name) return NextResponse.json({ error: "Please put their name." }, { status: 400 });
  const admin = createAdminClient();
  // An advisor has no advisor above them.
  const managerId = c.role === "advisor" ? null : c.managerId;
  if (!(await validManager(admin, managerId))) return NextResponse.json({ error: "Choose an advisor from the list." }, { status: 400 });

  for (let attempt = 0; attempt < 4; attempt++) {
    const { data, error } = await admin
      .from("field_agents")
      .insert({
        role: c.role,
        name: c.name,
        phone: c.phone,
        email: c.email,
        manager_id: managerId,
        ref_code: readableToken(c.name, true),
        dash_token: newToken(),
      })
      .select("id")
      .single();
    if (!error && data) return NextResponse.json({ ok: true, id: data.id });
    if (error && !/duplicate|unique/i.test(error.message))
      return NextResponse.json({ error: "This is not ready yet. Run doctors-schema.sql first." }, { status: 503 });
  }
  return NextResponse.json({ error: "Please try again." }, { status: 503 });
}

export async function PATCH(request: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Not allowed" }, { status: 401 });
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const id = String(body.id ?? "");
  const action = String(body.action ?? "");
  const admin = createAdminClient();
  const { data: a } = await admin.from("field_agents").select("id,role").eq("id", id).maybeSingle();
  if (!a) return NextResponse.json({ error: "No such person." }, { status: 404 });
  const now = new Date().toISOString();

  if (action === "on" || action === "off") {
    await admin.from("field_agents").update({ status: action === "on" ? "active" : "off", updated_at: now }).eq("id", id);
    return NextResponse.json({ ok: true });
  }
  if (action === "new_link") {
    await admin.from("field_agents").update({ dash_token: newToken(), updated_at: now }).eq("id", id);
    return NextResponse.json({ ok: true });
  }
  if (action === "edit") {
    const c = clean(body);
    if (!c.name) return NextResponse.json({ error: "Please put their name." }, { status: 400 });
    const managerId = a.role === "advisor" ? null : c.managerId;
    if (!(await validManager(admin, managerId, id))) return NextResponse.json({ error: "Choose an advisor from the list." }, { status: 400 });
    await admin
      .from("field_agents")
      .update({ name: c.name, phone: c.phone, email: c.email, manager_id: managerId, updated_at: now })
      .eq("id", id);
    return NextResponse.json({ ok: true });
  }
  return NextResponse.json({ error: "Unknown action." }, { status: 400 });
}

/**
 * DELETE { id, confirmName }: remove a field agent or advisor added by
 * mistake. Only somebody with no history: no doctors credited to them, no
 * agents under them, and no care fees or payouts. Anybody with history is
 * switched off instead, because deleting would leave their money records and
 * their doctors pointing at nobody.
 */
export async function DELETE(request: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Not allowed" }, { status: 401 });
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const id = String(body.id ?? "");
  const admin = createAdminClient();
  const { data: a } = await admin.from("field_agents").select("id,name").eq("id", id).maybeSingle();
  if (!a) return NextResponse.json({ error: "No such person." }, { status: 404 });
  if (String(body.confirmName ?? "").trim().toLowerCase() !== String(a.name).trim().toLowerCase())
    return NextResponse.json({ error: "Type their name exactly to delete them." }, { status: 400 });

  const [docs, team, earned, paid] = await Promise.all([
    admin.from("hospitals").select("id", { count: "exact", head: true }).eq("agent_id", id),
    admin.from("field_agents").select("id", { count: "exact", head: true }).eq("manager_id", id),
    admin.from("clinician_earnings").select("id", { count: "exact", head: true }).eq("agent_id", id),
    admin.from("earning_payouts").select("id", { count: "exact", head: true }).eq("agent_id", id),
  ]);
  if ((docs.count ?? 0) > 0) return NextResponse.json({ error: "They have doctors on record. Switch them off instead." }, { status: 409 });
  if ((team.count ?? 0) > 0) return NextResponse.json({ error: "Field agents are under them. Move or remove those first, or switch them off." }, { status: 409 });
  if ((earned.count ?? 0) + (paid.count ?? 0) > 0)
    return NextResponse.json({ error: "They have care fees on record. Switch them off instead." }, { status: 409 });

  const { error } = await admin.from("field_agents").delete().eq("id", id);
  if (error) return NextResponse.json({ error: "Could not delete. Please try again." }, { status: 503 });
  return NextResponse.json({ ok: true });
}
