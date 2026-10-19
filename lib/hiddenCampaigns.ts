import { createAdminClient } from "@/lib/supabase/server";

/**
 * Sent emails taken off the "Sent emails" list on /admin/email. Mailyte will
 * not delete a campaign that has already gone out, so "Delete" there hides it
 * here instead (the dialog only ever promised to remove it from this list).
 * Kept in `app_settings` under one key, a list of Mailyte campaign ids.
 */
const KEY = "hidden_campaigns";

export async function hiddenCampaigns(): Promise<Set<string>> {
  try {
    const { data } = await createAdminClient().from("app_settings").select("value").eq("key", KEY).maybeSingle();
    return new Set(Array.isArray(data?.value) ? (data.value as string[]) : []);
  } catch {
    return new Set();
  }
}

export async function hideCampaign(id: string): Promise<boolean> {
  const ids = await hiddenCampaigns();
  ids.add(id);
  const { error } = await createAdminClient()
    .from("app_settings")
    .upsert({ key: KEY, value: [...ids].slice(-500), updated_at: new Date().toISOString() });
  return !error;
}
