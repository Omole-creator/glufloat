import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { creatorForCode } from "@/lib/creatorsServer";

export const dynamic = "force-dynamic";

/**
 * GET ?code=FAITH: is this a real creator code? Answers { ok, code } only,
 * never who the creator is. Used by the code box on sign-up, before there is
 * an account to tie it to. Codes are public (creators say them in videos).
 */
export async function GET(request: Request) {
  const raw = new URL(request.url).searchParams.get("code") ?? "";
  const c = await creatorForCode(createAdminClient(), raw).catch(() => null);
  return NextResponse.json(c ? { ok: true, code: c.code } : { ok: false });
}
