import type { Metadata } from "next";
import HospitalShell from "@/components/hospital/HospitalShell";
import NotStaff from "@/components/hospital/NotStaff";
import { requireStaffPage } from "@/components/hospital/requireStaff";
import { hospitalLive, isDoctorPractice, isPractice, planName, practicePlanName, waitingForFirstPatient } from "@/lib/hospitalPlans";
import QrCodeCard from "@/components/hospital/QrCodeCard";
import InviteColleagueCard from "@/components/hospital/InviteColleagueCard";
import { SITE_URL } from "@/lib/site";
import { seatsUsed } from "@/lib/hospitalServer";
import { readInvoiceSettings } from "@/lib/invoiceSettings";
import type { DocumentForPdf } from "@/lib/hospitalPdf";
import BankDetailsForm from "@/components/BankDetailsForm";
import { maskAccount, nairaFromKobo } from "@/lib/careFees";
import { earningTotals, type EarningRow, type PayoutRow } from "@/lib/careFeesServer";
import { listBanks } from "@/lib/paystackBanks";
import { isPatientPays, patientPrice } from "@/lib/patientPays";
import { payingPatients } from "@/lib/patientPaysServer";
import PriceForm from "./PriceForm";
import PlanPanel from "./PlanPanel";
import PracticePlanPanel, { type PracticePayment } from "./PracticePlanPanel";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Plan", robots: { index: false, follow: false } };

export default async function PlanPage({ searchParams }: { searchParams: Promise<{ h?: string; paid?: string }> }) {
  const sp = await searchParams;
  const ctx = await requireStaffPage(sp.h, "/hospital/plan");
  if (!ctx) return <NotStaff />;
  if (ctx.staff.role !== "admin")
    return (
      <HospitalShell ctx={ctx} title="Plan and QR code">
        <p className="mt-6 rounded-2xl border border-[#e3e9f1] bg-white p-6 text-sm text-ink-soft">Only your hospital admin can see this page.</p>
      </HospitalShell>
    );
  const h = ctx.hospital;

  // GluFloat for doctors: nothing to pay. Their QR code for patients, and
  // their link for colleagues.
  if (isDoctorPractice(h))
    return (
      <HospitalShell ctx={ctx} title="QR code" subtitle="Patients scan it to join you. Colleagues sign up with your link.">
        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          <QrCodeCard name={h.name} code={h.code} open={hospitalLive(h)} practice />
          <InviteColleagueCard link={`${SITE_URL}/d/${h.code}`} />
        </div>
      </HospitalShell>
    );

  // GluFloat for dietitians (2026-10-17): her patients pay her inside the
  // app, so this is her price, her money and her QR code. Nothing to pay us.
  if (isPatientPays(h)) {
    const [{ data: earn }, { data: pays }, { data: pats }, banks, paying] = await Promise.all([
      ctx.admin
        .from("clinician_earnings")
        .select("id,reference,kind,hospital_id,agent_id,source_hospital_id,patient_user_id,payment_amount,amount,earned_at,payout_id")
        .eq("hospital_id", h.id)
        .order("earned_at", { ascending: false })
        .limit(1000),
      ctx.admin.from("earning_payouts").select("id,hospital_id,agent_id,amount,status,reference,note,created_at").eq("hospital_id", h.id).order("created_at", { ascending: false }),
      ctx.admin.from("hospital_patients").select("user_id,name").eq("hospital_id", h.id),
      listBanks(),
      payingPatients(ctx.admin, h.id, new Date().toISOString()),
    ]);
    const earnings = ((earn ?? []) as EarningRow[]).map((e) => ({ ...e, amount: Number(e.amount) }));
    const payouts = ((pays ?? []) as PayoutRow[]).map((p) => ({ ...p, amount: Number(p.amount) }));
    const totals = earningTotals(earnings, payouts);
    const names = new Map(((pats ?? []) as { user_id: string | null; name: string }[]).filter((p) => p.user_id).map((p) => [p.user_id as string, p.name]));
    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
    const thisMonth = earnings.filter((e) => e.earned_at >= monthStart).reduce((n, e) => n + e.amount, 0);
    const status = new Map(payouts.map((p) => [p.id, p.status]));
    const tiles = [
      { label: "To be paid", value: nairaFromKobo(totals.owed + totals.sending), sub: "paid to your bank every week" },
      { label: "This month", value: nairaFromKobo(thisMonth), sub: "from your patients so far" },
      { label: "Paid to you", value: nairaFromKobo(totals.paid), sub: "all time" },
    ];
    return (
      <HospitalShell ctx={ctx} title="Price and earnings" subtitle="Your patients pay you inside GluFloat">
        <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
          {tiles.map((t) => (
            <div key={t.label} className="min-w-0 rounded-2xl border border-[#e3e9f1] bg-white p-4 sm:p-5">
              <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-ink/50">{t.label}</p>
              <p className="mt-2 font-display text-2xl font-bold leading-none text-ink sm:text-3xl">{t.value}</p>
              <p className="mt-2 text-xs text-ink-soft">{t.sub}</p>
            </div>
          ))}
        </div>
        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          <PriceForm price={patientPrice(h)} hid={ctx.all.length > 1 ? h.id : null} payingPatients={paying} />
          <BankDetailsForm
            banks={banks}
            endpoint="/api/hospital/bank"
            extra={{ hid: ctx.all.length > 1 ? h.id : null }}
            saved={{ bankName: h.bank_name ?? null, accountShown: h.account_number ? maskAccount(h.account_number) : null, accountName: h.account_name ?? null }}
          />
        </div>
        <div className="mt-6">
          <QrCodeCard name={h.name} code={h.code} open={hospitalLive(h)} practice />
        </div>
        <section className="mt-6 rounded-2xl border border-[#e3e9f1] bg-white">
          <h2 className="border-b border-[#eef2f7] px-5 py-4 font-display text-lg font-bold text-ink">Payments from your patients</h2>
          {earnings.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-ink-soft">
              Nothing yet. When a patient pays you, your share shows here.
            </p>
          ) : (
            <ul className="divide-y divide-[#eef2f7]">
              {earnings.slice(0, 200).map((e) => {
                const paid = e.payout_id ? status.get(e.payout_id) === "paid" : false;
                return (
                  <li key={e.id} className="flex items-center justify-between gap-3 px-5 py-3 text-sm">
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-ink">{names.get(e.patient_user_id ?? "") ?? "A patient"}</p>
                      <p className="text-xs text-ink-soft">
                        {new Date(e.earned_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })} · paid{" "}
                        {nairaFromKobo(Number(e.payment_amount ?? 0))} · {paid ? "Sent to you" : "To be paid"}
                      </p>
                    </div>
                    <p className="shrink-0 font-display font-bold text-ink">{nairaFromKobo(e.amount)}</p>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </HospitalShell>
    );
  }

  // GluFloat for dietitians before #32 ran: she paid by Paystack, not by invoice.
  if (isPractice(h)) {
    const [used, paid, { data: pdocs }, pbank] = await Promise.all([
      seatsUsed(ctx.admin, h.id),
      ctx.admin
        .from("practice_payments")
        .select("reference,plan,amount,paid_at")
        .eq("hospital_id", h.id)
        .order("paid_at", { ascending: false })
        .limit(24),
      ctx.admin.from("hospital_documents").select("*").eq("hospital_id", h.id).neq("status", "void").order("created_at", { ascending: false }),
      readInvoiceSettings(ctx.admin),
    ]);
    return (
      <HospitalShell ctx={ctx} title="Plan and QR code" subtitle={h.plan && h.plan !== "pilot" ? practicePlanName(h.plan) : "Free days"}>
        <PracticePlanPanel
          practice={h}
          used={used}
          live={hospitalLive(h)}
          notStarted={waitingForFirstPatient(h)}
          email={ctx.user.email}
          payments={(paid.data ?? []) as PracticePayment[]}
          justPaid={sp.paid === "1"}
          documents={(pdocs ?? []) as (DocumentForPdf & { id: string })[]}
          bank={pbank}
        />
      </HospitalShell>
    );
  }

  const [used, { data: docs }, bank] = await Promise.all([
    seatsUsed(ctx.admin, h.id),
    ctx.admin.from("hospital_documents").select("*").eq("hospital_id", h.id).neq("status", "void").order("created_at", { ascending: false }),
    readInvoiceSettings(ctx.admin),
  ]);
  return (
    <HospitalShell ctx={ctx} title="Plan and QR code" subtitle={`${planName(h.plan)}${h.billing === "annual" ? ", paid yearly" : ""}`}>
      <PlanPanel
        hospital={h}
        live={hospitalLive(h)}
        used={used}
        documents={(docs ?? []) as (DocumentForPdf & { id: string })[]}
        bank={bank}
      />
    </HospitalShell>
  );
}
