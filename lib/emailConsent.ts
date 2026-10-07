"use client";

import { createClient } from "@/lib/supabase/client";

/**
 * Has this person said yes to GluFloat emails? (supabase/email-consent-schema.sql)
 * `null` means not asked yet. `unavailable` means the column is not there yet
 * (the SQL has not been run), so the question is not shown at all.
 */
export type EmailConsent = { state: "ok"; value: boolean | null } | { state: "unavailable" };

export async function readEmailConsent(): Promise<EmailConsent> {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { state: "unavailable" };
    const { data, error } = await supabase
      .from("profiles")
      .select("email_updates")
      .eq("id", user.id)
      .single();
    if (error) return { state: "unavailable" };
    const v = (data as { email_updates?: boolean | null } | null)?.email_updates;
    return { state: "ok", value: typeof v === "boolean" ? v : null };
  } catch {
    return { state: "unavailable" };
  }
}

/** Save the answer. False on any failure, so the screen can say it did not save. */
export async function saveEmailConsent(value: boolean): Promise<boolean> {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return false;
    const { error } = await supabase
      .from("profiles")
      .update({ email_updates: value, email_updates_at: new Date().toISOString() })
      .eq("id", user.id);
    return !error;
  } catch {
    return false;
  }
}
