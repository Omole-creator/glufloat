import type { SupabaseClient } from "@supabase/supabase-js";

export interface SubscriptionWrite {
  user_id: string;
  status: string;
  current_period_end: string;
  amount: number | null;
  tier: string;
  paystack_customer_code?: string | null;
  paystack_sub_code?: string | null;
  updated_at: string;
}

/**
 * Upsert a subscriptions row, tolerating a database that has not yet run
 * personalization-schema.sql (no `tier` column).
 *
 * This exists because a push here IS a release, and the code can reach
 * production before the migration has been pasted into Supabase. Without this
 * fallback, a REAL successful payment could fail to grant access at all: the
 * whole upsert errors on the missing column, so nothing is written and the
 * buyer paid for nothing. Retrying once without `tier` is what keeps a
 * payment from ever silently failing to grant access — the cost is only
 * losing tier detection (falls back to "basic" on read, see lib/account.ts)
 * until the migration actually runs.
 */
export async function upsertSubscription(
  admin: SupabaseClient,
  row: SubscriptionWrite,
): Promise<void> {
  const { error } = await admin.from("subscriptions").upsert(row, { onConflict: "user_id" });
  if (error) {
    const { tier: _tier, ...withoutTier } = row;
    void _tier;
    await admin.from("subscriptions").upsert(withoutTier, { onConflict: "user_id" });
  }
}
