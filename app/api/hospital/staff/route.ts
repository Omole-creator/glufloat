import { NextResponse } from "next/server";
import { readableToken, staffContext, type StaffRole } from "@/lib/hospitalServer";
import { normalizePhone } from "@/lib/phone";

export const dynamic = "force-dynamic";

const ROLES: StaffRole[] = ["admin", "doctor", "dietitian"];
const INVITE_DAYS = 14;

/** Invite a doctor, dietitian or another admin. Hospital admins only. */
export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const ctx = await staffContext(String(body.hid ?? "") || null);
  if (!ctx) return NextResponse.json({ error: "Please log in again." }, { status: 401 });
  if (ctx.staff.role !== "admin") return NextResponse.json({ error: "Only the hospital admin can invite staff." }, { status: 403 });
  const role = String(body.role ?? "") as StaffRole;
  if (!ROLES.includes(role)) return NextResponse.json({ error: "Choose doctor, dietitian or admin." }, { status: 400 });
  const name = String(body.name ?? "").trim().slice(0, 120);
  if (!name) return NextResponse.json({ error: "Put their name." }, { status: 400 });
  const phone = normalizePhone(String(body.phone ?? ""));

  // e.g. /hospital/join/chidi42-r8t2wx (founder's choice): their first name.
  const token = readableToken(name, true);
  const { error } = await ctx.admin.from("hospital_invites").insert({
    token,
    hospital_id: ctx.hospital.id,
    role,
    name,
    phone: phone || null,
    expires_at: new Date(Date.now() + INVITE_DAYS * 86400000).toISOString(),
  });
  if (error) return NextResponse.json({ error: "We could not make the invite. Please try again." }, { status: 503 });
  return NextResponse.json({ ok: true, token });
}

/**
 * Choose who patients chat with: one dietitian and one doctor (founder,
 * 2026-10-12). Each must really be that kind of staff at this hospital.
 * Needs hospital-chat-schema.sql (#23).
 */
export async function PATCH(request: Request) {
  const body = await request.json().catch(() => ({}));
  const ctx = await staffContext(String(body.hid ?? "") || null);
  if (!ctx) return NextResponse.json({ error: "Please log in again." }, { status: 401 });
  if (ctx.staff.role !== "admin") return NextResponse.json({ error: "Only the hospital admin can change this." }, { status: 403 });
  const { data: staff } = await ctx.admin.from("hospital_staff").select("user_id,role").eq("hospital_id", ctx.hospital.id);
  const patch: Record<string, string | null> = {};
  for (const [field, key, role] of [
    ["chat_dietitian_id", "dietitianId", "dietitian"],
    ["chat_doctor_id", "doctorId", "doctor"],
  ] as const) {
    if (!(key in body)) continue;
    const id = String(body[key] ?? "") || null;
    if (id && !(staff ?? []).some((s) => s.user_id === id && s.role === role))
      return NextResponse.json({ error: `That person is not one of your ${role}s.` }, { status: 400 });
    patch[field] = id;
  }
  const { error } = await ctx.admin.from("hospitals").update({ ...patch, updated_at: new Date().toISOString() }).eq("id", ctx.hospital.id);
  if (error) return NextResponse.json({ error: "This needs a GluFloat update. Please contact GluFloat." }, { status: 503 });
  return NextResponse.json({ ok: true });
}

/** Remove a staff member, or cancel an invite not used yet. */
export async function DELETE(request: Request) {
  const body = await request.json().catch(() => ({}));
  const ctx = await staffContext(String(body.hid ?? "") || null);
  if (!ctx) return NextResponse.json({ error: "Please log in again." }, { status: 401 });
  if (ctx.staff.role !== "admin") return NextResponse.json({ error: "Only the hospital admin can remove staff." }, { status: 403 });

  const inviteToken = String(body.inviteToken ?? "");
  if (inviteToken) {
    await ctx.admin.from("hospital_invites").delete().eq("token", inviteToken).eq("hospital_id", ctx.hospital.id).is("used_at", null);
    return NextResponse.json({ ok: true });
  }

  const userId = String(body.userId ?? "");
  const { data: staff } = await ctx.admin.from("hospital_staff").select("user_id,role").eq("hospital_id", ctx.hospital.id);
  const target = (staff ?? []).find((s) => s.user_id === userId);
  if (!target) return NextResponse.json({ error: "That person is not on your staff." }, { status: 404 });
  const admins = (staff ?? []).filter((s) => s.role === "admin");
  if (target.role === "admin" && admins.length <= 1)
    return NextResponse.json({ error: "Your hospital needs at least one admin. Invite another admin first." }, { status: 400 });
  await ctx.admin.from("hospital_staff").delete().eq("hospital_id", ctx.hospital.id).eq("user_id", userId);
  // A removed person's chat choice falls back to the first of that kind
  // automatically (chatContacts), and the column clears itself on delete only
  // if the account goes, so clear it here too.
  if (ctx.hospital.chat_dietitian_id === userId)
    await ctx.admin.from("hospitals").update({ chat_dietitian_id: null }).eq("id", ctx.hospital.id);
  if (ctx.hospital.chat_doctor_id === userId)
    await ctx.admin.from("hospitals").update({ chat_doctor_id: null }).eq("id", ctx.hospital.id);
  return NextResponse.json({ ok: true });
}
