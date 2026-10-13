import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * The old partner link: /r/ada4.
 *
 * The partner programme was removed on 2026-10-13 (founder: GluFloat now has
 * hospitals, dietitians, and invite-a-friend for patients). Links already
 * printed or sent on WhatsApp still work: they open the home page, the same
 * place they always led, and nobody is credited.
 */
export async function GET(request: Request) {
  return NextResponse.redirect(new URL("/", request.url));
}
