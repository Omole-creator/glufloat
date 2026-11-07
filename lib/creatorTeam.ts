/**
 * Everything the creator screens show: each creator, the people they
 * brought, and their money. Counts and money only, never a person's name.
 * Read by /admin/creator-partners and /creator/<token>. Server only.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { fetchAll } from "@/lib/adminFetch";
import { payableNow } from "@/lib/creators";
import type { Creator } from "@/lib/creatorsServer";

export type CreatorEarning = {
  id: string;
  reference: string;
  creator_id: string | null;
  user_id: string | null;
  payment_amount: number;
  paystack_fee: number;
  rate: number;
  amount: number;
  earned_at: string;
  payout_id: string | null;
};

export type CreatorPayout = { id: string; creator_id: string | null; amount: number; reference: string; note: string | null; created_at: string };

export type CreatorStats = {
  creator: Creator;
  /** People who signed up through their link or code. */
  joined: number;
  /** Of those, how many have paid at least once. */
  paid: number;
  /** Ready to pay out now (at least 14 days old, not yet paid). */
  payable: number;
  payableIds: string[];
  /** Earned, but under 14 days old. */
  waiting: number;
  /** Paid to them, all time. */
  paidOut: number;
  earnings: CreatorEarning[];
  payouts: CreatorPayout[];
  /** One row per person, numbered, never named: when they joined and what the creator earned from them. */
  people: { joinedAt: string; via: string; paid: boolean; earned: number }[];
};

export async function loadCreators(admin: SupabaseClient, onlyId?: string): Promise<CreatorStats[]> {
  // Small tables: read them whole and pick out one creator in memory.
  const [creators, users, earnings, payouts] = await Promise.all([
    fetchAll<Creator>(() => admin.from("creators").select("*").order("created_at", { ascending: false })),
    fetchAll<{ user_id: string; creator_id: string; via: string; attached_at: string }>(() =>
      admin.from("creator_users").select("user_id,creator_id,via,attached_at").order("attached_at", { ascending: true }),
    ),
    fetchAll<CreatorEarning>(() => admin.from("creator_earnings").select("*").order("earned_at", { ascending: false })),
    fetchAll<CreatorPayout>(() => admin.from("creator_payouts").select("*").order("created_at", { ascending: false })),
  ]);
  const now = Date.now();
  const list = onlyId ? creators.rows.filter((c) => c.id === onlyId) : creators.rows;
  return list.map((c) => {
    const mine = users.rows.filter((u) => u.creator_id === c.id);
    const earned = earnings.rows.filter((e) => e.creator_id === c.id).map((e) => ({ ...e, amount: Number(e.amount) }));
    const unpaid = earned.filter((e) => !e.payout_id);
    const ready = unpaid.filter((e) => payableNow(e.earned_at, now));
    const payers = new Set(earned.map((e) => e.user_id).filter(Boolean) as string[]);
    return {
      creator: c,
      joined: mine.length,
      paid: payers.size,
      payable: ready.reduce((n, e) => n + e.amount, 0),
      payableIds: ready.map((e) => e.id),
      waiting: unpaid.filter((e) => !payableNow(e.earned_at, now)).reduce((n, e) => n + e.amount, 0),
      paidOut: payouts.rows.filter((p) => p.creator_id === c.id).reduce((n, p) => n + Number(p.amount), 0),
      earnings: earned,
      payouts: payouts.rows.filter((p) => p.creator_id === c.id),
      people: mine.map((u) => ({
        joinedAt: u.attached_at,
        via: u.via,
        paid: payers.has(u.user_id),
        earned: earned.filter((e) => e.user_id === u.user_id).reduce((n, e) => n + e.amount, 0),
      })),
    };
  });
}
