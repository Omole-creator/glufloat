"use client";

import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";

/**
 * Who is signed in on this phone, read from the session the browser already
 * holds, with no trip to the server.
 *
 * `auth.getUser()` asks Supabase every time, and the app called it 15 times on
 * one open. In the browser that check protects nothing: the database checks the
 * sign-in token itself on every read and write (row-level security), so a
 * tampered session can only fool the person's own screen, never reach another
 * person's rows. Server code (`app/api`, `lib/supabase/server.ts`) keeps
 * `getUser()`, because there it really is the gate.
 */
export async function currentUser(): Promise<User | null> {
  try {
    const { data } = await createClient().auth.getSession();
    return data.session?.user ?? null;
  } catch {
    return null;
  }
}
