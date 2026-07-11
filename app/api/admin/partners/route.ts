import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ADMIN_COOKIE, adminToken } from "@/lib/adminAuth";
import { createAdminClient } from "@/lib/supabase/server";
import { partnerCode } from "@/lib/partners";

export const dynamic = "force-dynamic";

async function requireAdmin(): Promise<boolean> {
  const c = await cookies();
  return !!process.env.ADMIN_PASSWORD && c.get(ADMIN_COOKIE)?.value === adminToken();
}

/**
 * Add a health professional, and generate their link.
 *
 * The link code needs the partner's position in the queue (the 4th ever added is
 * "4"), and that number is only decided by the database when the row is
 * inserted. So the row goes in first with a placeholder code, and the real code
 * is written straight after, once we know the number. Two steps, one partner.
 */
export async function POST(request: Request) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Not allowed" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const name = String(body.name ?? "").trim();
  const profession = String(body.profession ?? "").trim();
  const email = String(body.email ?? "").trim().toLowerCase();
  const phone = String(body.phone ?? "").trim() || null;

  if (!name) return NextResponse.json({ error: "Add their name." }, { status: 400 });
  if (!profession) return NextResponse.json({ error: "Choose what they do." }, { status: 400 });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Add a real email address." }, { status: 400 });
  }

  const admin = createAdminClient();

  // A placeholder unique code, so the insert cannot collide before we know `seq`.
  const temp = `pending-${crypto.randomUUID().slice(0, 8)}`;
  const { data: created, error } = await admin
    .from("partners")
    .insert({ name, profession, email, phone, code: temp })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const code = partnerCode(name, created.seq);
  const { data: partner, error: e2 } = await admin
    .from("partners")
    .update({ code })
    .eq("id", created.id)
    .select()
    .single();

  if (e2) {
    // Never leave a partner stranded with a placeholder link.
    await admin.from("partners").delete().eq("id", created.id);
    return NextResponse.json({ error: e2.message }, { status: 400 });
  }

  return NextResponse.json({ partner });
}

/**
 * Edit a partner, or switch their link on and off.
 *
 * `code` is deliberately NOT editable, even when the name changes. The link is
 * already printed on a card in somebody's clinic, or sitting in a WhatsApp
 * message. Changing it would break every copy of it that is already out there,
 * and quietly stop crediting them. Correcting a spelling in a name must never
 * cost a nurse her referrals.
 */
export async function PATCH(request: Request) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Not allowed" }, { status: 401 });
  }
  const body = await request.json().catch(() => ({}));
  const id = body.id;
  if (!id) return NextResponse.json({ error: "No partner given." }, { status: 400 });

  const patch: Record<string, unknown> = {};

  if (typeof body.active === "boolean") patch.active = body.active;

  if (body.name !== undefined) {
    const name = String(body.name).trim();
    if (!name) return NextResponse.json({ error: "Add their name." }, { status: 400 });
    patch.name = name;
  }
  if (body.profession !== undefined) {
    const profession = String(body.profession).trim();
    if (!profession) return NextResponse.json({ error: "Choose what they do." }, { status: 400 });
    patch.profession = profession;
  }
  if (body.email !== undefined) {
    const email = String(body.email).trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Add a real email address." }, { status: 400 });
    }
    patch.email = email;
  }
  if (body.phone !== undefined) {
    patch.phone = String(body.phone).trim() || null;
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "Nothing to change." }, { status: 400 });
  }

  const { data, error } = await createAdminClient()
    .from("partners")
    .update(patch)
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ partner: data });
}

/**
 * Delete a partner. Only when there is nothing to lose.
 *
 * The table cascades: deleting a partner would take their commissions and their
 * payout history with it, and cut every user they brought loose. That is fine
 * for someone added by mistake five minutes ago, and it is destroying financial
 * records for anybody else.
 *
 * So a partner who has already brought somebody in, or earned anything, cannot
 * be deleted. They get switched OFF instead: the link stops working, the numbers
 * stay, and the people they brought keep their history. Refusing here is the
 * feature, not a limitation.
 */
export async function DELETE(request: Request) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Not allowed" }, { status: 401 });
  }
  const { id } = await request.json().catch(() => ({}));
  if (!id) return NextResponse.json({ error: "No partner given." }, { status: 400 });

  const admin = createAdminClient();

  const [{ count: users }, { count: earned }, { count: paid }] = await Promise.all([
    admin.from("profiles").select("id", { count: "exact", head: true }).eq("partner_id", id),
    admin.from("commissions").select("id", { count: "exact", head: true }).eq("partner_id", id),
    admin.from("payouts").select("id", { count: "exact", head: true }).eq("partner_id", id),
  ]);

  if ((users ?? 0) > 0 || (earned ?? 0) > 0 || (paid ?? 0) > 0) {
    const bits = [
      (users ?? 0) > 0 ? `${users} person${users === 1 ? "" : "s"} signed up through them` : "",
      (earned ?? 0) > 0 ? "they have earned money" : "",
      (paid ?? 0) > 0 ? "you have paid them before" : "",
    ].filter(Boolean);

    return NextResponse.json(
      {
        error: `Cannot delete this partner: ${bits.join(", ")}. Deleting them would wipe that history. Switch their link off instead. It stops working straight away and the records are kept.`,
      },
      { status: 409 },
    );
  }

  const { error } = await admin.from("partners").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
