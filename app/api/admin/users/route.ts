import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ADMIN_COOKIE, adminToken } from "@/lib/adminAuth";
import { createAdminClient } from "@/lib/supabase/server";
import { isUserType } from "@/lib/userType";

export const dynamic = "force-dynamic";

async function requireAdmin(): Promise<boolean> {
  const c = await cookies();
  return !!process.env.ADMIN_PASSWORD && c.get(ADMIN_COOKIE)?.value === adminToken();
}

/**
 * Edit a person's name, email, phone, or what they are (diabetic / health
 * worker / family member / not set). One admin screen, so a mistake made at
 * sign-up, or a typo the person wrote in about, can be put right without
 * touching the database by hand.
 *
 * Email is the one field that is NOT just a `profiles` column: it is also the
 * real login on `auth.users`. Editing only `profiles.email` would leave
 * someone able to sign in with their old address while every screen shows the
 * new one, and it would silently break the webhook's email-match fallback
 * (`payerUserId` in the Paystack webhook). So an email change updates BOTH,
 * via the Auth Admin API, in the same request — never one without the other.
 */
export async function PATCH(request: Request) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Not allowed" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const id = body.id;
  if (!id) return NextResponse.json({ error: "No user given." }, { status: 400 });

  const admin = createAdminClient();
  const updates: Record<string, string | null> = {};

  if ("user_type" in body) {
    const raw = body.user_type;
    const user_type = raw === null || raw === "" ? null : raw;
    if (user_type !== null && !isUserType(user_type)) {
      return NextResponse.json({ error: "That is not one of the choices." }, { status: 400 });
    }
    updates.user_type = user_type;
  }

  if ("name" in body) {
    const name = String(body.name ?? "").trim();
    if (!name) return NextResponse.json({ error: "A name is needed." }, { status: 400 });
    updates.name = name;
  }

  if ("phone" in body) {
    updates.phone = String(body.phone ?? "").trim() || null;
  }

  if ("email" in body) {
    const email = String(body.email ?? "").trim().toLowerCase();
    if (!email || !email.includes("@")) {
      return NextResponse.json({ error: "That is not a real email address." }, { status: 400 });
    }
    // The real login, changed first. If this fails (e.g. another account
    // already uses that address), nothing else is touched.
    const { error: authError } = await admin.auth.admin.updateUserById(id, { email });
    if (authError) {
      return NextResponse.json({ error: authError.message }, { status: 400 });
    }
    updates.email = email;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "Nothing to change." }, { status: 400 });
  }

  const { data, error } = await admin
    .from("profiles")
    .update(updates)
    .eq("id", id)
    .select("id,name,email,phone,user_type")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ profile: data });
}

/**
 * Remove a person's account entirely: the real login (auth.users) AND
 * everything that cascades from it — profile, subscription, meal history,
 * dietitian assignment. Deletes through the Auth Admin API, never a raw table
 * delete, so the login itself is actually gone, not just the profile row
 * (which would leave a ghost account able to sign in to a blank slate).
 *
 * What is deliberately NOT deleted: `payments` (user_id is `on delete set
 * null`) and a partner's `commissions` earned from this person. Those are
 * financial records — the same reason a partner with earnings can never be
 * deleted either. Deleting the person must not also erase what was paid or
 * what a partner earned from them.
 */
export async function DELETE(request: Request) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Not allowed" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const id = body.id;
  if (!id) return NextResponse.json({ error: "No user given." }, { status: 400 });

  const { error } = await createAdminClient().auth.admin.deleteUser(id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
