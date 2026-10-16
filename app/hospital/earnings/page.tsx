import type { Metadata } from "next";
import HospitalShell from "@/components/hospital/HospitalShell";
import NotStaff from "@/components/hospital/NotStaff";
import { requireStaffPage } from "@/components/hospital/requireStaff";
import BankDetailsForm from "@/components/BankDetailsForm";
import InviteColleagueCard from "@/components/hospital/InviteColleagueCard";
import { isDoctorPractice, PREMIUM_MONTHLY } from "@/lib/hospitalPlans";
import { DOCTOR_RATE, maskAccount, nairaFromKobo } from "@/lib/careFees";
import { doctorsReady, earningTotals, type EarningRow, type PayoutRow } from "@/lib/careFeesServer";
import { listBanks } from "@/lib/paystackBanks";
import { SITE_URL } from "@/lib/site";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Earnings", robots: { index: false, follow: false } };

/**
 * A GluFloat doctor's care fees: what they have earned looking after their
 * patients, what is still to be paid, and the bank account it goes to. Only
 * the doctor sees this. Nothing here names a field agent.
 */
export default async function EarningsPage({ searchParams }: { searchParams: Promise<{ h?: string }> }) {
  const sp = await searchParams;
  const ctx = await requireStaffPage(sp.h, "/hospital/earnings");
  if (!ctx) return <NotStaff />;
  const h = ctx.hospital;
  if (!isDoctorPractice(h) || ctx.staff.role !== "admin")
    return (
      <HospitalShell ctx={ctx} title="Earnings">
        <p className="mt-6 rounded-2xl border border-[#e3e9f1] bg-white p-6 text-sm text-ink-soft">This page is for GluFloat doctors.</p>
      </HospitalShell>
    );
  if (!(await doctorsReady(ctx.admin)))
    return (
      <HospitalShell ctx={ctx} title="Earnings">
        <p className="mt-6 rounded-2xl border border-[#e3e9f1] bg-white p-6 text-sm text-ink-soft">This is not ready yet. Please check again soon.</p>
      </HospitalShell>
    );

  const [{ data: earn }, { data: pays }, { data: pats }, banks] = await Promise.all([
    ctx.admin
      .from("clinician_earnings")
      .select("id,reference,kind,hospital_id,agent_id,source_hospital_id,patient_user_id,payment_amount,amount,earned_at,payout_id")
      .eq("hospital_id", h.id)
      .order("earned_at", { ascending: false })
      .limit(1000),
    ctx.admin.from("earning_payouts").select("id,hospital_id,agent_id,amount,status,reference,note,created_at").eq("hospital_id", h.id).order("created_at", { ascending: false }),
    ctx.admin.from("hospital_patients").select("user_id,name").eq("hospital_id", h.id),
    listBanks(),
  ]);
  const earnings = (earn ?? []) as EarningRow[];
  const payouts = (pays ?? []) as PayoutRow[];
  const totals = earningTotals(earnings, payouts);
  const names = new Map(((pats ?? []) as { user_id: string | null; name: string }[]).filter((p) => p.user_id).map((p) => [p.user_id as string, p.name]));
  const colleagueIds = [...new Set(earnings.filter((e) => e.kind === "colleague" && e.source_hospital_id).map((e) => e.source_hospital_id as string))];
  const colleagues = new Map<string, string>();
  if (colleagueIds.length) {
    const { data } = await ctx.admin.from("hospitals").select("id,name").in("id", colleagueIds);
    for (const c of (data ?? []) as { id: string; name: string }[]) colleagues.set(c.id, c.name);
  }
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
  const thisMonth = earnings.filter((e) => e.earned_at >= monthStart).reduce((n, e) => n + e.amount, 0);
  const perPatient = nairaFromKobo(Math.floor(PREMIUM_MONTHLY * 100 * DOCTOR_RATE));
  const status = new Map(payouts.map((p) => [p.id, p.status]));

  const tiles = [
    { label: "To be paid", value: nairaFromKobo(totals.owed + totals.sending), sub: "paid to your bank every week" },
    { label: "This month", value: nairaFromKobo(thisMonth), sub: "earned so far" },
    { label: "Paid to you", value: nairaFromKobo(totals.paid), sub: "all time" },
  ];

  return (
    <HospitalShell ctx={ctx} title="Earnings" subtitle="Your care fees for looking after your patients on GluFloat">
      <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
        {tiles.map((t) => (
          <div key={t.label} className="min-w-0 rounded-2xl border border-[#e3e9f1] bg-white p-4 sm:p-5">
            <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-ink/50">{t.label}</p>
            <p className="mt-2 font-display text-2xl font-bold leading-none text-ink sm:text-3xl">{t.value}</p>
            <p className="mt-2 text-xs text-ink-soft">{t.sub}</p>
          </div>
        ))}
      </div>

      <p className="mt-4 rounded-2xl bg-brand/[0.06] px-4 py-3 text-sm text-ink ring-1 ring-inset ring-brand/10">
        You earn a care fee of <span className="font-semibold">{perPatient}</span> for each patient you look after, every month they
        are on GluFloat Premium. It is paid to your bank every week.
      </p>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <BankDetailsForm
          banks={banks}
          endpoint="/api/hospital/bank"
          extra={{ hid: ctx.all.length > 1 ? h.id : null }}
          saved={{ bankName: h.bank_name ?? null, accountShown: h.account_number ? maskAccount(h.account_number) : null, accountName: h.account_name ?? null }}
        />
        <InviteColleagueCard link={`${SITE_URL}/d/${h.code}`} />
      </div>

      <section className="mt-6 rounded-2xl border border-[#e3e9f1] bg-white">
        <h2 className="border-b border-[#eef2f7] px-5 py-4 font-display text-lg font-bold text-ink">Your care fees</h2>
        {earnings.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-ink-soft">
            Nothing yet. Your care fees show here when your patients subscribe to GluFloat Premium.
          </p>
        ) : (
          <ul className="divide-y divide-[#eef2f7]">
            {earnings.slice(0, 200).map((e) => {
              const s = e.payout_id ? status.get(e.payout_id) : undefined;
              const paid = s === "paid";
              return (
                <li key={e.id} className="flex items-center justify-between gap-3 px-5 py-3 text-sm">
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-ink">
                      {e.kind === "colleague"
                        ? `Colleague bonus: ${colleagues.get(e.source_hospital_id ?? "") ?? "a colleague"}`
                        : names.get(e.patient_user_id ?? "") ?? "A patient"}
                    </p>
                    <p className="text-xs text-ink-soft">
                      {new Date(e.earned_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })} ·{" "}
                      {paid ? "Paid" : "To be paid"}
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
