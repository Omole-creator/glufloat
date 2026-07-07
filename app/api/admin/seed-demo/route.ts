import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ADMIN_COOKIE, adminToken } from "@/lib/adminAuth";
import { createAdminClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const EMAIL = "demo@glufloat.com";
const PASSWORD = "GlufloatDemo2026!";

// One-time: create a permanent free test account (far-future subscription so it
// never needs to pay). Admin-cookie protected. Removed after use.
export async function POST() {
  const c = await cookies();
  if (c.get(ADMIN_COOKIE)?.value !== adminToken()) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  const admin = createAdminClient();

  let userId: string | undefined;
  const { data: created } = await admin.auth.admin.createUser({
    email: EMAIL,
    password: PASSWORD,
    email_confirm: true,
    user_metadata: { name: "Demo (test account)" },
  });
  if (created?.user) userId = created.user.id;
  else {
    const { data } = await admin.auth.admin.listUsers({ perPage: 1000 });
    const u = data.users.find(
      (x: { email?: string }) => (x.email || "").toLowerCase() === EMAIL,
    );
    if (u) {
      userId = u.id;
      await admin.auth.admin.updateUserById(u.id, { password: PASSWORD });
    }
  }
  if (!userId) return NextResponse.json({ ok: false }, { status: 500 });

  await admin.from("subscriptions").upsert(
    {
      user_id: userId,
      status: "active",
      current_period_end: new Date("2099-01-01").toISOString(),
      amount: 150000,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );
  return NextResponse.json({ ok: true, email: EMAIL });
}
