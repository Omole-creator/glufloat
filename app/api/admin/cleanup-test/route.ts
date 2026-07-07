import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ADMIN_COOKIE, adminToken } from "@/lib/adminAuth";
import { createAdminClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

// One-time maintenance: delete the @glutest.com accounts created during testing.
// Admin-cookie protected. Removed after use.
export async function POST() {
  const c = await cookies();
  if (c.get(ADMIN_COOKIE)?.value !== adminToken()) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  const admin = createAdminClient();
  const { data } = await admin.auth.admin.listUsers({ perPage: 1000 });
  const targets = (data?.users ?? []).filter((u: { email?: string }) =>
    (u.email || "").toLowerCase().endsWith("@glutest.com"),
  );
  let deleted = 0;
  for (const u of targets) {
    const { error } = await admin.auth.admin.deleteUser(u.id);
    if (!error) deleted++;
  }
  return NextResponse.json({ ok: true, found: targets.length, deleted });
}
