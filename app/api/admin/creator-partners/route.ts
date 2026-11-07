import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/adminSession";
import { createAdminClient } from "@/lib/supabase/server";
import { newToken } from "@/lib/hospitalServer";
import { normalizePhone } from "@/lib/phone";
import { codeFromName, normalizeCode, validCode } from "@/lib/creators";

export const dynamic = "force-dynamic";

/**
 * Creator partners, added by Glufloat (they never sign up).
 *
 * POST  add one            { name, phone, email, code? }  (code defaults to the first name)
 * PATCH { id, action }     on | off | new_link | edit { name, phone, email }
 * DELETE { id, confirmName } only somebody with no people, earnings or payouts
 *
 * The code is never edited after it is made: it is already in videos and posts.
 */
function clean(body: Record<string, unknown>) {
  const clip = (v: unknown, n = 200) => String(v ?? "").trim().slice(0, n);
  const email = clip(body.email, 200).toLowerCase();
  return {
    name: clip(body.name, 120),
    phone: normalizePhone(clip(body.phone, 40)) || null,
    email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null,
    code: normalizeCode(clip(body.code, 40)),
  };
}

export async function POST(request: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Not allowed" }, { status: 401 });
  const c = clean(await request.json().catch(() => ({})));
  if (!c.name) return NextResponse.json({ error: "Please put their name." }, { status: 400 });
  const admin = createAdminClient();
  const { data: rows, error: readErr } = await admin.from("creators").select("code");
  if (readErr) return NextResponse.json({ error: "This is not ready yet. Run creator-partners-schema.sql first." }, { status: 503 });
  const taken = new Set((rows ?? []).map((r) => r.code as string));

  let code = c.code;
  if (code) {
    if (!validCode(code))
      return NextResponse.json({ error: "A code is 3 to 20 letters or numbers, starting with a letter, and not one of our own page names." }, { status: 400 });
    if (taken.has(code)) return NextResponse.json({ error: `${code} is already used by another creator.` }, { status: 409 });
  } else code = codeFromName(c.name, taken);

  const { data, error } = await admin
    .from("creators")
    .insert({ name: c.name, phone: c.phone, email: c.email, code, dash_token: newToken() })
    .select("id,code")
    .single();
  if (error) {
    if (/duplicate|unique/i.test(error.message)) return NextResponse.json({ error: "That code was just taken. Please try again." }, { status: 409 });
    return NextResponse.json({ error: "This did not save. Please try again." }, { status: 503 });
  }
  return NextResponse.json({ ok: true, id: data.id, code: data.code });
}

export async function PATCH(request: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Not allowed" }, { status: 401 });
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const id = String(body.id ?? "");
  const action = String(body.action ?? "");
  const admin = createAdminClient();
  const { data: c } = await admin.from("creators").select("id").eq("id", id).maybeSingle();
  if (!c) return NextResponse.json({ error: "No such creator." }, { status: 404 });
  const now = new Date().toISOString();

  if (action === "on" || action === "off") {
    await admin.from("creators").update({ status: action === "on" ? "active" : "off", updated_at: now }).eq("id", id);
    return NextResponse.json({ ok: true });
  }
  if (action === "new_link") {
    await admin.from("creators").update({ dash_token: newToken(), updated_at: now }).eq("id", id);
    return NextResponse.json({ ok: true });
  }
  if (action === "edit") {
    const e = clean(body);
    if (!e.name) return NextResponse.json({ error: "Please put their name." }, { status: 400 });
    await admin.from("creators").update({ name: e.name, phone: e.phone, email: e.email, updated_at: now }).eq("id", id);
    return NextResponse.json({ ok: true });
  }
  return NextResponse.json({ error: "Unknown action." }, { status: 400 });
}

/**
 * Delete a creator added by mistake. Anybody with people, earnings or
 * payouts is switched off instead, because deleting would leave money
 * records and their people pointing at nobody.
 */
export async function DELETE(request: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Not allowed" }, { status: 401 });
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const id = String(body.id ?? "");
  const admin = createAdminClient();
  const { data: c } = await admin.from("creators").select("id,name").eq("id", id).maybeSingle();
  if (!c) return NextResponse.json({ error: "No such creator." }, { status: 404 });
  if (String(body.confirmName ?? "").trim().toLowerCase() !== String(c.name).trim().toLowerCase())
    return NextResponse.json({ error: "Type their name exactly to delete them." }, { status: 400 });
  const [people, earned, paid] = await Promise.all([
    admin.from("creator_users").select("user_id", { count: "exact", head: true }).eq("creator_id", id),
    admin.from("creator_earnings").select("id", { count: "exact", head: true }).eq("creator_id", id),
    admin.from("creator_payouts").select("id", { count: "exact", head: true }).eq("creator_id", id),
  ]);
  if ((people.count ?? 0) > 0) return NextResponse.json({ error: "People signed up with their code. Switch them off instead." }, { status: 409 });
  if ((earned.count ?? 0) + (paid.count ?? 0) > 0)
    return NextResponse.json({ error: "They have money on record. Switch them off instead." }, { status: 409 });
  const { error } = await admin.from("creators").delete().eq("id", id);
  if (error) return NextResponse.json({ error: "Could not delete. Please try again." }, { status: 503 });
  return NextResponse.json({ ok: true });
}
