import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Stethoscope } from "lucide-react";
import { isAdmin } from "@/lib/adminSession";
import { createAdminClient } from "@/lib/supabase/server";
import AdminLogin from "../../AdminLogin";
import AdminShell from "../../AdminShell";
import AdminHero from "../../AdminHero";
import AdminCard from "../../AdminCard";
import { hospitalLive, nairaText, practicePlanName, waitingForFirstPatient } from "@/lib/hospitalPlans";
import { dietitianShareNaira, isPatientPays, patientPrice } from "@/lib/patientPays";
import FoldCard from "@/components/FoldCard";
import EditDietitian from "./EditDietitian";
import { earningTotals, type EarningRow, type PayoutRow } from "@/lib/careFeesServer";
import { nairaFromKobo } from "@/lib/careFees";
import { whatsappNumber, type HospitalRow } from "@/lib/hospitalServer";
import { hospitalRoster } from "@/lib/hospitalRoster";
import DietitianSwitch from "../DietitianSwitch";
import DeleteDietitian from "./DeleteDietitian";

export const dynamic = "force-dynamic";

const STATUS: Record<string, string> = {
  active: "Using GluFloat",
  waiting: "Waiting for a place",
  invited: "Invited",
  paused: "Paused",
};

function shortDate(iso: string | null): string {
  if (!iso) return "-";
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

/**
 * One dietitian, from GluFloat's side (founder, 2026-10-13): her details and
 * every patient in her account. Use, not health: who is using it, how much
 * they log and whether their payment to her is up to date. No sugar numbers
 * here; those are hers and her patients'.
 */
export default async function DietitianAdminPage({ params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdmin())) return <AdminLogin />;
  const { id } = await params;
  const admin = createAdminClient();
  const { data } = await admin.from("hospitals").select("*").eq("id", id).maybeSingle();
  if (!data || data.kind !== "dietitian") notFound();
  const p = data as HospitalRow;
  const [rows, { data: earn }, { data: pays }] = await Promise.all([
    hospitalRoster(admin, p.id),
    admin
      .from("clinician_earnings")
      .select("id,reference,kind,hospital_id,agent_id,source_hospital_id,patient_user_id,payment_amount,amount,earned_at,payout_id")
      .eq("hospital_id", p.id)
      .limit(5000),
    admin.from("earning_payouts").select("id,hospital_id,agent_id,amount,status,reference,note,created_at").eq("hospital_id", p.id),
  ]);
  const money = earningTotals(
    ((earn ?? []) as EarningRow[]).map((e) => ({ ...e, amount: Number(e.amount) })),
    ((pays ?? []) as PayoutRow[]).map((x) => ({ ...x, amount: Number(x.amount) })),
  );
  const active = rows.filter((r) => r.status === "active");
  const wa = whatsappNumber(p.contact_phone);
  const now = Date.now();
  const due = active.filter((r) => r.paidUntil && new Date(r.paidUntil).getTime() <= now).length;
  const payer = isPatientPays(p);
  const withTime = active.filter((r) => r.paidUntil && new Date(r.paidUntil).getTime() > now).length;
  const state =
    p.status === "declined"
      ? "Switched off"
      : payer
        ? "Patients pay her in the app"
        : waitingForFirstPatient(p)
        ? "No patient yet"
        : hospitalLive(p)
          ? `${p.status === "pilot" ? "Free" : "Paid"} until ${shortDate(p.access_until)}`
          : `Ended ${shortDate(p.access_until)}`;

  return (
    <AdminShell title={p.name} subtitle="Dietitian" icon={<Stethoscope className="h-5 w-5" />}>
      <Link href="/admin/dietitians" className="mt-2 inline-flex items-center gap-1.5 text-sm font-semibold text-brand hover:underline">
        <ArrowLeft className="h-4 w-4" /> All dietitians
      </Link>

      <div className="mt-4">
        <AdminHero
          items={[
            payer
              ? { label: "Price a month", value: nairaText(patientPrice(p)), sub: `she gets ${nairaText(dietitianShareNaira(patientPrice(p)))}` }
              : { label: "Plan", value: p.plan && p.plan !== "pilot" ? practicePlanName(p.plan) : "Free days", sub: state },
            payer
              ? { label: "Patients", value: String(active.length), sub: `${withTime} with time left` }
              : { label: "Places used", value: `${active.length} of ${p.seats}`, sub: `${rows.filter((r) => r.status === "waiting").length} waiting` },
            { label: "Paused", value: String(rows.filter((r) => r.status === "paused").length), sub: "kept on the list" },
            { label: "Payment due", value: String(due), sub: "time ran out, not paid yet" },
          ]}
        />
      </div>

      <div className="mt-6">
        <AdminCard title="Details">
          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-ink-soft">DCN number</dt>
              <dd className="font-mono font-semibold text-ink">{p.dcn_number ?? "-"}</dd>
            </div>
            <div>
              <dt className="text-ink-soft">WhatsApp</dt>
              <dd className="font-semibold text-ink">
                {wa ? (
                  <a href={`https://wa.me/${wa}`} target="_blank" rel="noopener noreferrer" className="text-brand hover:underline">
                    {p.contact_phone}
                  </a>
                ) : (
                  p.contact_phone ?? "-"
                )}
              </dd>
            </div>
            <div>
              <dt className="text-ink-soft">Email</dt>
              <dd className="font-semibold text-ink">{p.contact_email ?? "-"}</dd>
            </div>
            <div>
              <dt className="text-ink-soft">Owed to her</dt>
              <dd className="font-semibold text-ink">{nairaFromKobo(money.owed + money.sending)}</dd>
            </div>
            <div>
              <dt className="text-ink-soft">Paid to her</dt>
              <dd className="font-semibold text-ink">{nairaFromKobo(money.paid)}</dd>
            </div>
            <div>
              <dt className="text-ink-soft">Bank</dt>
              <dd className="font-semibold text-ink">
                {p.account_number ? `${p.account_name} · ${p.bank_name} · ${p.account_number}` : "Not added yet"}
              </dd>
            </div>
            <div>
              <dt className="text-ink-soft">Joined GluFloat</dt>
              <dd className="font-semibold text-ink">{shortDate(p.created_at)}</dd>
            </div>
          </dl>
          <div className="mt-4 flex flex-wrap gap-2">
            <DietitianSwitch id={p.id} name={p.name} off={p.status === "declined"} />
            <DeleteDietitian id={p.id} name={p.name} />
          </div>
        </AdminCard>
      </div>

      <div id="edit" className="mt-6 scroll-mt-24">
        <FoldCard title="Edit details" sub="Name, DCN number, WhatsApp, email and price" open>
          <EditDietitian
            id={p.id}
            initial={{
              name: p.name,
              phone: p.contact_phone ?? "",
              email: p.contact_email ?? "",
              dcn: p.dcn_number ?? "",
              price: patientPrice(p),
            }}
          />
        </FoldCard>
      </div>

      <div className="mt-6">
        <AdminCard title={`Patients (${rows.length})`} flush>
          {rows.length === 0 ? (
            <p className="px-6 pb-6 text-sm text-ink-soft">No patients yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-sm">
                <thead>
                  <tr className="border-y border-[#e3e9f1] bg-[#f7f9fc] text-left text-[11px] font-bold uppercase tracking-[0.06em] text-ink/50">
                    <th className="px-5 py-2.5">Patient</th>
                    <th className="px-3 py-2.5">Status</th>
                    <th className="px-3 py-2.5">Joined</th>
                    <th className="px-3 py-2.5">Last used</th>
                    <th className="px-3 py-2.5 text-right">Meals, 30 days</th>
                    <th className="px-5 py-2.5">Paid until</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => {
                    const late = r.status === "active" && r.paidUntil && new Date(r.paidUntil).getTime() <= now;
                    return (
                      <tr key={r.id} className="border-b border-[#eef2f7]">
                        <td className="px-5 py-3">
                          <p className="font-semibold text-ink">{r.name}</p>
                          <p className="text-xs text-ink-soft">{r.phone}</p>
                        </td>
                        <td className="px-3 py-3 text-ink">{STATUS[r.status] ?? r.status}</td>
                        <td className="px-3 py-3 text-ink-soft">{shortDate(r.joinedAt)}</td>
                        <td className="px-3 py-3 text-ink-soft">{r.status === "active" ? shortDate(r.lastActive) : "-"}</td>
                        <td className="px-3 py-3 text-right text-ink">{r.status === "active" ? r.meals30 : "-"}</td>
                        <td className={`px-5 py-3 ${late ? "font-semibold text-verdict-red" : "text-ink"}`}>
                          {r.status === "paused" ? "Paused" : r.paidUntil ? shortDate(r.paidUntil) : "-"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </AdminCard>
      </div>
    </AdminShell>
  );
}
