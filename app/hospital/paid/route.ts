import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * The first address a Paystack dietitian page redirected to. The page moved
 * to /dietitians/paid (founder, 2026-10-13); this forwards, with Paystack's
 * ?reference= kept, so a page still set to the old address never loses a
 * payment.
 */
export function GET(request: Request) {
  const from = new URL(request.url);
  const to = new URL("/dietitians/paid", from);
  to.search = from.search;
  return NextResponse.redirect(to);
}
