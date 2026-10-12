import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { sessionUser } from "@/lib/hospitalServer";
import { normalizePhone } from "@/lib/phone";
import { isPhoneLoginEmail } from "@/lib/phoneLogin";

export const dynamic = "force-dynamic";

/**
 * Somebody opens a staff invite (/hospital/join/TOKEN) and becomes the
 * hospital's admin, doctor or dietitian.
 *
 * Signed in: their account is added. New: an account is made here (email +
 * password; staff use email so "Forgot your password?" works for them) and the
 * browser signs in with it. An invite works once and for 14 days.
 */
export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const token = String(body.token ?? "").trim();
  const useSession = body.useSession === true;
  if (!token) return NextResponse.json({ error: "This link is not right." }, { status: 400 });

  const admin = createAdminClient();
  const { data: invite } = await admin.from("hospital_invites").select("*").eq("token", token).maybeSingle();
  if (!invite || invite.used_at || new Date(invite.expires_at as string).getTime() < Date.now())
    return NextResponse.json({ error: "This invite has been used or is too old. Please ask for a new one." }, { status: 410 });

  let uid: string;
  let login: string | null = null;
  let name = String(body.name ?? "").trim().slice(0, 120) || (invite.name as string | null) || "";
  let phone = normalizePhone(String(body.phone ?? "")) || normalizePhone(invite.phone as string | null);

  const session = useSession ? await sessionUser() : null;
  if (session) {
    uid = session.id;
    const { data: p } = await admin.from("profiles").select("name,phone").eq("id", uid).maybeSingle();
    name = name || ((p?.name as string | null) ?? "") || "Staff";
    phone = phone || normalizePhone((p?.phone as string | null) ?? "");
  } else {
    const email = String(body.email ?? "").trim().toLowerCase();
    const password = String(body.password ?? "");
    if (!name) return NextResponse.json({ error: "Please put your name." }, { status: 400 });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || isPhoneLoginEmail(email))
      return NextResponse.json({ error: "Please put your email address." }, { status: 400 });
    if (phone.length < 10) return NextResponse.json({ error: "Please put your phone number." }, { status: 400 });
    if (password.length < 6) return NextResponse.json({ error: "Your password needs 6 or more letters or numbers." }, { status: 400 });
    const { data: created, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name, phone, user_type: "health_pro", source_post: null, partner_code: null },
    });
    if (error || !created.user) {
      if (/already|registered|exists/i.test(error?.message ?? ""))
        return NextResponse.json(
          { needLogin: true, error: "You already have a GluFloat account with this email. Log in first, then open this link again." },
          { status: 409 },
        );
      return NextResponse.json({ error: "We could not make your account just now. Please try again." }, { status: 503 });
    }
    uid = created.user.id;
    login = email;
  }

  // Use the invite once. Whoever stamps it first wins.
  const { data: claimed } = await admin
    .from("hospital_invites")
    .update({ used_at: new Date().toISOString(), used_by: uid })
    .eq("token", token)
    .is("used_at", null)
    .select("token");
  if (!claimed || claimed.length === 0)
    return NextResponse.json({ error: "This invite has just been used. Please ask for a new one." }, { status: 410 });

  const { error: sErr } = await admin.from("hospital_staff").upsert(
    { hospital_id: invite.hospital_id, user_id: uid, role: invite.role, name, phone: phone || null },
    { onConflict: "hospital_id,user_id" },
  );
  if (sErr) return NextResponse.json({ error: "We could not add you just now. Please try again." }, { status: 503 });

  return NextResponse.json({ ok: true, login });
}
