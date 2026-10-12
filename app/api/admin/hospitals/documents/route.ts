import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/adminSession";
import { createAdminClient } from "@/lib/supabase/server";
import { documentAmountKobo, extendAccess, planName, type HospitalBilling, type HospitalPlanId } from "@/lib/hospitalPlans";
import { VAT_RATE, readInvoiceSettings } from "@/lib/invoiceSettings";

export const dynamic = "force-dynamic";

const PLANS = ["care50", "care100", "care200", "custom"] as const;

async function nextNumber(admin: ReturnType<typeof createAdminClient>, kind: "quote" | "invoice"): Promise<string> {
  const year = new Date().getUTCFullYear();
  const prefix = `GF-${kind === "quote" ? "Q" : "INV"}-${year}-`;
  const { data } = await admin
    .from("hospital_documents")
    .select("number")
    .like("number", `${prefix}%`)
    .order("number", { ascending: false })
    .limit(1);
  const last = data?.[0]?.number as string | undefined;
  const n = last ? Number(last.slice(prefix.length)) + 1 : 1;
  return `${prefix}${String(n).padStart(4, "0")}`;
}

/** Make a quote or an invoice for a hospital. */
export async function POST(request: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Not allowed" }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  const admin = createAdminClient();
  const kind = body.kind === "invoice" ? "invoice" : "quote";
  const plan = String(body.plan ?? "") as HospitalPlanId | "custom";
  if (!(PLANS as readonly string[]).includes(plan)) return NextResponse.json({ error: "Pick a plan." }, { status: 400 });
  const billing: HospitalBilling = body.billing === "annual" ? "annual" : "monthly";
  const { data: h } = await admin.from("hospitals").select("id").eq("id", String(body.hospitalId ?? "")).maybeSingle();
  if (!h) return NextResponse.json({ error: "No such hospital." }, { status: 404 });
  if (plan === "custom" && !(Number(body.seats) > 0))
    return NextResponse.json({ error: "A custom plan needs a number of patients." }, { status: 400 });

  const settings = await readInvoiceSettings(admin);
  const vatRate = settings.vatOn ? VAT_RATE : 0;
  const amt = documentAmountKobo({ plan, billing, seats: Number(body.seats), perPatient: Number(body.perPatient), vatRate });
  const dueDays = Math.min(90, Math.max(0, Number.parseInt(String(body.dueDays ?? "7"), 10) || 7));
  const due = new Date(Date.now() + dueDays * 86400000).toISOString().slice(0, 10);
  const notes = String(body.notes ?? "").trim().slice(0, 600) || null;

  for (let attempt = 0; attempt < 3; attempt++) {
    const number = await nextNumber(admin, kind);
    const { data, error } = await admin
      .from("hospital_documents")
      .insert({
        number,
        kind,
        hospital_id: h.id,
        plan,
        seats: amt.seats,
        billing,
        months: amt.months,
        amount: amt.total,
        vat_rate: vatRate,
        notes,
        due_on: due,
      })
      .select("*")
      .single();
    if (!error) return NextResponse.json({ ok: true, document: data });
    if (!/duplicate|unique/i.test(error.message)) return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json({ error: "Please try again." }, { status: 503 });
}

/**
 * paid     the hospital's transfer has arrived: its plan, places and end date
 *          move forward, and the money is added to /admin/finance as revenue.
 *          Only an OPEN invoice, and only once (the status flips first).
 *  void     cancel a quote or an invoice that was wrong.
 *  invoice  turn a quote the hospital accepted into an invoice.
 */
export async function PATCH(request: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Not allowed" }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  const admin = createAdminClient();
  const id = String(body.id ?? "");
  const action = String(body.action ?? "");
  const { data: doc } = await admin.from("hospital_documents").select("*").eq("id", id).maybeSingle();
  if (!doc) return NextResponse.json({ error: "No such document." }, { status: 404 });

  if (action === "void") {
    if (doc.status !== "open") return NextResponse.json({ error: "Only an open document can be cancelled." }, { status: 400 });
    await admin.from("hospital_documents").update({ status: "void" }).eq("id", id);
    return NextResponse.json({ ok: true });
  }

  if (action === "invoice") {
    if (doc.kind !== "quote") return NextResponse.json({ error: "This is already an invoice." }, { status: 400 });
    for (let attempt = 0; attempt < 3; attempt++) {
      const number = await nextNumber(admin, "invoice");
      const { data, error } = await admin
        .from("hospital_documents")
        .insert({
          number,
          kind: "invoice",
          hospital_id: doc.hospital_id,
          plan: doc.plan,
          seats: doc.seats,
          billing: doc.billing,
          months: doc.months,
          amount: doc.amount,
          vat_rate: doc.vat_rate,
          notes: doc.notes,
          due_on: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
        })
        .select("*")
        .single();
      if (!error) return NextResponse.json({ ok: true, document: data });
      if (!/duplicate|unique/i.test(error.message)) return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: "Please try again." }, { status: 503 });
  }

  if (action === "paid") {
    if (doc.kind !== "invoice") return NextResponse.json({ error: "Turn the quote into an invoice first." }, { status: 400 });
    const paidOn = /^\d{4}-\d{2}-\d{2}$/.test(String(body.paidOn ?? "")) ? String(body.paidOn) : new Date().toISOString().slice(0, 10);
    // Flip the status first: a double tap cannot add the months twice.
    const { data: flipped } = await admin
      .from("hospital_documents")
      .update({ status: "paid", paid_on: paidOn })
      .eq("id", id)
      .eq("status", "open")
      .select("id");
    if (!flipped || flipped.length === 0) return NextResponse.json({ error: "This invoice is already paid or cancelled." }, { status: 409 });

    const { data: h } = await admin.from("hospitals").select("*").eq("id", doc.hospital_id).single();
    // Founder, 2026-10-12: a pilot that pays early keeps its free days. Paid
    // time is added on after whatever is left, pilot or paid alike.
    const until = extendAccess(h.access_until as string | null, doc.months as number);
    await admin
      .from("hospitals")
      .update({
        status: "active",
        plan: doc.plan,
        seats: doc.seats,
        billing: doc.billing,
        access_until: until.toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", doc.hospital_id);

    // Revenue on /admin/finance. Never into `payments`: the partner commission
    // trigger and the invite reward fire on that table.
    const { error: fErr } = await admin.from("finance_income").insert({
      received_on: paidOn,
      amount: doc.amount,
      kind: "other_revenue",
      source: `Hospital: ${h.name}`,
      note: `${doc.number}, ${planName(doc.plan as string)}, ${doc.billing === "annual" ? "12 months" : "1 month"}`,
    });
    return NextResponse.json({ ok: true, until: until.toISOString(), financeSaved: !fErr });
  }

  return NextResponse.json({ error: "Unknown action." }, { status: 400 });
}
