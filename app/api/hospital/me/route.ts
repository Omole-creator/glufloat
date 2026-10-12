import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { hospitalStatusFor, sessionUser } from "@/lib/hospitalServer";

export const dynamic = "force-dynamic";

/**
 * Is the signed-in person covered by a hospital, and are they a hospital's
 * staff? Read by getAccess() (lib/account.ts) on every app open.
 *
 * It must never lock anybody out: if the hospital tables do not exist yet, or
 * anything at all goes wrong, it answers "no hospital" and the person's own
 * trial or plan decides their access exactly as it always did.
 */
export async function GET() {
  const empty = { patient: null, staff: [] };
  const user = await sessionUser();
  if (!user) return NextResponse.json(empty);
  try {
    const status = await hospitalStatusFor(createAdminClient(), user.id);
    return NextResponse.json(status, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json(empty);
  }
}
