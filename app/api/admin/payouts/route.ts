import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/adminSession";
import { createAdminClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * "Mark as paid": GluFloat has sent this week's money to one doctor or field
 * agent, and records it. By id, never "everything pending": the earning ids
 * the admin page showed are the ones stamped, so a care fee earned in the
 * seconds between loading the page and pressing the button stays owed and
 * turns up next week instead of being marked paid with no money sent (the
 * same rule the old partner payouts followed).
 *
 * POST { hospitalId | agentId, earningIds: string[], note? }
 */
export async function POST(request: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Not allowed" }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  const hospitalId = typeof body.hospitalId === "string" && body.hospitalId ? body.hospitalId : null;
  const agentId = typeof body.agentId === "string" && body.agentId ? body.agentId : null;
  const ids = (Array.isArray(body.earningIds) ? body.earningIds : []).map(String).slice(0, 5000);
  if ((!hospitalId) === (!agentId) || ids.length === 0) return NextResponse.json({ error: "Nothing to mark." }, { status: 400 });
  const admin = createAdminClient();

  // Only this person's earnings, and only ones not already paid.
  const { data: rows } = await admin
    .from("clinician_earnings")
    .select("id,amount,payout_id,hospital_id,agent_id")
    .in("id", ids);
  const failed = new Set<string>();
  const payoutIds = [...new Set(((rows ?? []) as { payout_id: string | null }[]).map((r) => r.payout_id).filter((x): x is string => !!x))];
  if (payoutIds.length) {
    const { data: ps } = await admin.from("earning_payouts").select("id,status").in("id", payoutIds);
    for (const p of (ps ?? []) as { id: string; status: string }[]) if (p.status === "failed") failed.add(p.id);
  }
  const mine = ((rows ?? []) as { id: string; amount: number; payout_id: string | null; hospital_id: string | null; agent_id: string | null }[]).filter(
    (r) => (hospitalId ? r.hospital_id === hospitalId : r.agent_id === agentId) && (!r.payout_id || failed.has(r.payout_id)),
  );
  if (mine.length === 0) return NextResponse.json({ error: "This has already been marked as paid." }, { status: 409 });

  const total = mine.reduce((n, r) => n + Number(r.amount), 0);
  const { data: payout, error } = await admin
    .from("earning_payouts")
    .insert({
      hospital_id: hospitalId,
      agent_id: agentId,
      amount: total,
      status: "paid",
      reference: `gf-care-${randomBytes(8).toString("hex")}`,
      note: typeof body.note === "string" ? body.note.slice(0, 200) || null : null,
    })
    .select("id")
    .single();
  if (error || !payout) return NextResponse.json({ error: "This did not save. Please try again." }, { status: 503 });

  // Stamp exactly these rows. A row stamped by somebody else at the same moment is skipped.
  const free = mine.filter((r) => !r.payout_id).map((r) => r.id);
  const retry = mine.filter((r) => r.payout_id).map((r) => r.id);
  let claimed = 0;
  if (free.length) {
    const { data } = await admin.from("clinician_earnings").update({ payout_id: payout.id }).in("id", free).is("payout_id", null).select("amount");
    claimed += ((data ?? []) as { amount: number }[]).reduce((n, r) => n + Number(r.amount), 0);
  }
  if (retry.length) {
    const { data } = await admin
      .from("clinician_earnings")
      .update({ payout_id: payout.id })
      .in("id", retry)
      .in("payout_id", [...failed])
      .select("amount");
    claimed += ((data ?? []) as { amount: number }[]).reduce((n, r) => n + Number(r.amount), 0);
  }
  if (claimed === 0) {
    await admin.from("earning_payouts").delete().eq("id", payout.id);
    return NextResponse.json({ error: "This has already been marked as paid." }, { status: 409 });
  }
  if (claimed !== total) await admin.from("earning_payouts").update({ amount: claimed }).eq("id", payout.id);
  return NextResponse.json({ ok: true, amount: claimed });
}
