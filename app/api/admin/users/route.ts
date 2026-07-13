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
 * Change what somebody is: diabetic, health worker, family member, or back to
 * not set.
 *
 * People tap the wrong one, or write in to say they picked wrong. `null` is
 * allowed on purpose, and it is the undo: it puts them back with the accounts
 * that never answered, rather than forcing you to guess a group for them.
 *
 * Nothing else about a user is editable here. This route can only ever touch
 * `user_type`, so a mistake in the admin screen cannot rewrite somebody's email.
 */
export async function PATCH(request: Request) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Not allowed" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const id = body.id;
  if (!id) return NextResponse.json({ error: "No user given." }, { status: 400 });

  const raw = body.user_type;
  const user_type = raw === null || raw === "" ? null : raw;
  if (user_type !== null && !isUserType(user_type)) {
    return NextResponse.json({ error: "That is not one of the choices." }, { status: 400 });
  }

  const { data, error } = await createAdminClient()
    .from("profiles")
    .update({ user_type })
    .eq("id", id)
    .select("id,name,email,user_type")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ profile: data });
}
