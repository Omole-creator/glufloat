import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createAdminClient } from "@/lib/supabase/server";
import { sessionUser } from "@/lib/hospitalServer";
import {
  CREATOR_CODE_COOKIE,
  CREATOR_COOKIE,
  attachCreator,
  creatorForCode,
  creatorStatusFor,
  type AttachResult,
} from "@/lib/creatorsServer";

export const dynamic = "force-dynamic";

/**
 * GET: this person's creator code and whether they still get 20% off
 * ({ ready: false } before creator-partners-schema.sql runs).
 *
 * POST { code? }: tie this account to a creator. With a typed code, that
 * code; without one, the creator whose link this device came through (the
 * httpOnly cookie, which the browser cannot write). Identity is the session.
 */
export async function GET() {
  const user = await sessionUser();
  if (!user) return NextResponse.json({ ready: false }, { status: 401 });
  const s = await creatorStatusFor(createAdminClient(), user.id);
  if (!s) return NextResponse.json({ ready: false });
  return NextResponse.json({ ready: true, ...s });
}

const SAY: Record<AttachResult, string> = {
  attached: "",
  already: "",
  other_creator: "You already have a code.",
  paid: "A code can only be added before your first payment.",
  rep: "You joined Glufloat through someone else, so a code cannot be added.",
  no_creator: "We could not find that code. Please check the spelling.",
  not_ready: "This is not ready yet. Please try again later.",
};

export async function POST(request: Request) {
  const user = await sessionUser();
  if (!user) return NextResponse.json({ ok: false, error: "Please log in again." }, { status: 401 });
  const body = (await request.json().catch(() => ({}))) as { code?: unknown };
  const typed = typeof body.code === "string" ? body.code.trim() : "";
  const jar = await cookies();
  const fromLink = jar.get(CREATOR_COOKIE)?.value ?? "";
  const admin = createAdminClient();

  let result: AttachResult;
  if (typed) {
    const c = await creatorForCode(admin, typed);
    result = c ? await attachCreator(admin, user.id, c.id, "code") : "no_creator";
  } else if (fromLink) {
    result = await attachCreator(admin, user.id, fromLink, "link");
  } else {
    return NextResponse.json({ ok: false });
  }

  const ok = result === "attached" || result === "already";
  const status = ok ? await creatorStatusFor(admin, user.id) : null;
  const res = NextResponse.json(
    { ok, result, error: ok ? undefined : SAY[result], ...(status ?? {}) },
    { status: ok || !typed ? 200 : 400 },
  );
  // The link cookie has done its job on this device, unless the tables are not there yet.
  if (fromLink && result !== "not_ready") {
    res.cookies.set(CREATOR_COOKIE, "", { path: "/", maxAge: 0 });
    res.cookies.set(CREATOR_CODE_COOKIE, "", { path: "/", maxAge: 0 });
  }
  return res;
}
