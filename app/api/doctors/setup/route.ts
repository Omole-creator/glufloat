import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { sessionUser } from "@/lib/hospitalServer";

export const dynamic = "force-dynamic";

/**
 * A doctor opens the link from their set-up email (/doctors/setup/TOKEN) and
 * becomes the doctor who runs their practice. Signed in already: that account
 * is used. New: an account is made with the email the link was sent to (the
 * link itself proves the address) and the password they choose. The link
 * works once and for 14 days. No phone number is asked for.
 */
export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const token = String(body.token ?? "").trim();
  const useSession = body.useSession === true;
  if (!token) return NextResponse.json({ error: "This link is not right." }, { status: 400 });

  const admin = createAdminClient();
  const { data: invite } = await admin
    .from("hospital_invites")
    .select("*,hospitals(id,kind,status)")
    .eq("token", token)
    .maybeSingle();
  const practice = (invite as unknown as { hospitals: { id: string; kind: string | null; status: string } | null } | null)?.hospitals;
  if (!invite || !practice || practice.kind !== "doctor" || invite.used_at || new Date(invite.expires_at as string).getTime() < Date.now())
    return NextResponse.json({ error: "This link has been used or is too old. Please sign up again to get a new one." }, { status: 410 });
  if (practice.status !== "active") return NextResponse.json({ error: "This account is not open. Please call us on 0813 209 7317." }, { status: 410 });

  const name = String(invite.name ?? "").trim() || "Doctor";
  const email = String(invite.email ?? "").trim().toLowerCase();
  let uid: string;
  let login: string | null = null;

  const session = useSession ? await sessionUser() : null;
  if (session) {
    uid = session.id;
  } else {
    const password = String(body.password ?? "");
    if (password.length < 6) return NextResponse.json({ error: "Your password needs 6 or more letters or numbers." }, { status: 400 });
    const { data: created, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name, phone: null, user_type: "health_pro", source_post: null, partner_code: null },
    });
    if (error || !created.user) {
      if (/already|registered|exists/i.test(error?.message ?? ""))
        return NextResponse.json(
          { needLogin: true, error: "You already have a GluFloat login with this email. Log in first, then open this link again." },
          { status: 409 },
        );
      return NextResponse.json({ error: "We could not make your login just now. Please try again." }, { status: 503 });
    }
    uid = created.user.id;
    login = email;
  }

  // Use the link once. Whoever stamps it first wins.
  const { data: claimed } = await admin
    .from("hospital_invites")
    .update({ used_at: new Date().toISOString(), used_by: uid })
    .eq("token", token)
    .is("used_at", null)
    .select("token");
  if (!claimed || claimed.length === 0)
    return NextResponse.json({ error: "This link has just been used. Please log in." }, { status: 410 });

  const { error: sErr } = await admin
    .from("hospital_staff")
    .upsert({ hospital_id: practice.id, user_id: uid, role: "admin", name, phone: null }, { onConflict: "hospital_id,user_id" });
  if (sErr) return NextResponse.json({ error: "We could not finish setting you up. Please try again." }, { status: 503 });

  return NextResponse.json({ ok: true, login });
}
