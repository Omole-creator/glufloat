import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { AREA_HEADER } from "@/lib/staffArea";

/**
 * Refreshes the Supabase auth session cookie on each request to the app/auth
 * routes (Next 16 "proxy", formerly "middleware"). Scoped by the matcher below
 * so the static marketing pages are untouched.
 */
export async function proxy(request: NextRequest) {
  // A nurse partner's dashboard (founder, 2026-11-24): /nurse/... is served by
  // the /hospital/... pages, with a header that tells them which address was
  // used (components/hospital/requireStaff.tsx, lib/staffArea.ts).
  const nurse = /^\/nurse(\/|$)/.test(request.nextUrl.pathname);
  // Built fresh each time, so a refreshed session cookie (setAll below) rides along.
  const area = () => {
    const h = new Headers(request.headers);
    h.delete(AREA_HEADER);
    if (nurse) h.set(AREA_HEADER, "nurse");
    return h;
  };
  const target = request.nextUrl.clone();
  if (nurse) target.pathname = request.nextUrl.pathname.replace(/^\/nurse/, "/hospital");
  const pass = () =>
    nurse ? NextResponse.rewrite(target, { request: { headers: area() } }) : NextResponse.next({ request: { headers: area() } });
  let response = pass();

  // If Supabase is not configured yet, do nothing more (keeps the site working).
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) return response;

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = pass();
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  await supabase.auth.getUser(); // revalidates and refreshes the session
  return response;
}

export const config = {
  matcher: ["/app/:path*", "/trial/:path*", "/signup", "/signin", "/admin/:path*", "/hospital/:path*", "/nurse", "/nurse/:path*", "/setup/:path*", "/j/:path*", "/inbox/:path*", "/doctors/start", "/doctors/setup/:path*", "/account/:path*"],
};
