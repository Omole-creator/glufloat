import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Refreshes the Supabase auth session cookie on each request to the app/auth
 * routes (Next 16 "proxy", formerly "middleware"). Scoped by the matcher below
 * so the static marketing pages are untouched.
 */
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  // If Supabase is not configured yet, do nothing (keeps the site working).
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
          response = NextResponse.next({ request });
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
  matcher: ["/app/:path*", "/trial/:path*", "/signup", "/signin", "/admin/:path*"],
};
