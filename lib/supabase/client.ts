import { createBrowserClient } from "@supabase/ssr";

/**
 * Supabase client for use in Client Components (runs in the browser).
 *
 * @supabase/ssr hardcodes flowType to "pkce" inside createBrowserClient
 * itself (it spreads its own `flowType: "pkce"` after `options.auth`, so
 * this cannot be overridden from here). That means the forgot-password
 * email link can only be completed in the SAME browser that requested it
 * — the code_verifier it needs lives only in that browser's local storage.
 * Opening the link in a different app or device (e.g. request on the
 * phone's browser, open the email in the phone's Gmail app) will show
 * "This link no longer works" even on a fresh, unused link. This is
 * Supabase's own documented trade-off for SSR apps, not something fixable
 * client-side.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
