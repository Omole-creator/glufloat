import { Stethoscope } from "lucide-react";
import { isAdmin } from "@/lib/adminSession";
import { createAdminClient } from "@/lib/supabase/server";
import AdminLogin from "../AdminLogin";
import AdminShell from "../AdminShell";
import AdminHero from "../AdminHero";
import AdminCard from "../AdminCard";
import Link from "next/link";
import { nairaText } from "@/lib/hospitalPlans";
import { dietitianShareNaira, isPatientPays, patientPrice } from "@/lib/patientPays";
import { whatsappNumber, type HospitalRow } from "@/lib/hospitalServer";
import { isInternalEmail } from "@/lib/internalAccounts";
import DietitianSwitch from "./DietitianSwitch";

export const dynamic = "force-dynamic";

/**
 * GluFloat for dietitians, from GluFloat's side (2026-10-13). Dietitians sign
 * up themselves at /dietitians/start; this is where their DCN numbers are
 * checked and where one that does not check out is switched off. Since
 * 2026-10-17 (patient-pays-schema.sql) her patients pay her inside the app at
 * her own price; GluFloat keeps N2,000 of each payment. Nothing to invoice.
 */

function shortDate(iso: string | null): string {
  if (!iso) return "-";
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function statusOf(p: HospitalRow): { label: string; tone: string } {
  if (p.status === "declined") return { label: "Switched off", tone: "bg-verdict-red/10 text-verdict-red" };
  if (!isPatientPays(p)) return { label: "Old plan (run #32)", tone: "bg-verdict-yellow/20 text-ink" };
  return { label: "Open", tone: "bg-leaf/10 text-leaf-deep" };
}

export default async function DietitiansAdminPage() {
  if (!(await isAdmin())) return <AdminLogin />;
  const admin = createAdminClient();

  const ready = await admin.from("hospitals").select("kind").limit(1);
  if (ready.error) {
    return (
      <AdminShell title="Dietitians" icon={<Stethoscope className="h-5 w-5" />}>
        <div className="mt-6 rounded-2xl border border-[#e3e9f1] bg-white p-6 text-sm text-ink-soft">
          Waiting for the database update. Paste <code className="font-mono text-ink">supabase/dietitian-practice-schema.sql</code>{" "}
          into the Supabase SQL editor (#25 in SETUP.md).
        </div>
      </AdminShell>
    );
  }

  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
  const [{ data: ps }, { data: pats }, payRes] = await Promise.all([
    admin.from("hospitals").select("*").eq("kind", "dietitian").order("created_at", { ascending: false }),
    admin.from("hospital_patients").select("hospital_id,status,paid_until").in("status", ["active", "paused"]),
    admin.from("patient_payments").select("hospital_id,amount,dietitian_share,paid_at").gte("paid_at", monthStart),
  ]);
  // Test accounts (any @glufloat.com email) are left out, like every admin number.
  const practices = ((ps ?? []) as HospitalRow[]).filter((p) => !isInternalEmail(p.contact_email ?? ""));
  const mine = new Set(practices.map((p) => p.id));
  const now = Date.now();
  const counts = new Map<string, { all: number; paid: number }>();
  for (const p of (pats ?? []) as { hospital_id: string; status: string; paid_until: string | null }[]) {
    const c = counts.get(p.hospital_id) ?? { all: 0, paid: 0 };
    c.all += 1;
    if (p.status === "active" && p.paid_until && new Date(p.paid_until).getTime() > now) c.paid += 1;
    counts.set(p.hospital_id, c);
  }
  // Patient payments this month (none before #32 runs: the table is missing).
  const pays = ((payRes.error ? [] : payRes.data) ?? []) as { hospital_id: string | null; amount: number; dietitian_share: number }[];
  const monthPays = pays.filter((x) => x.hospital_id && mine.has(x.hospital_id));
  const paidIn = monthPays.reduce((n, x) => n + Number(x.amount), 0) / 100;
  const toThem = monthPays.reduce((n, x) => n + Number(x.dietitian_share), 0) / 100;

  const on = practices.filter((p) => p.status !== "declined");
  const patients = on.reduce((n, p) => n + (counts.get(p.id)?.all ?? 0), 0);
  const withTime = on.reduce((n, p) => n + (counts.get(p.id)?.paid ?? 0), 0);

  return (
    <AdminShell title="Dietitians" subtitle="GluFloat for dietitians" icon={<Stethoscope className="h-5 w-5" />}>
      <div className="mt-6">
        <AdminHero
          items={[
            { label: "Dietitians", value: String(on.length), sub: `${on.filter((p) => (counts.get(p.id)?.all ?? 0) === 0).length} with no patient yet` },
            { label: "Their patients", value: patients.toLocaleString(), sub: `${withTime} with time left` },
            { label: "Paid by patients", value: nairaText(paidIn), sub: `this month, ${monthPays.length} ${monthPays.length === 1 ? "payment" : "payments"}` },
            { label: "GluFloat kept", value: nairaText(paidIn - toThem), sub: `${nairaText(toThem)} to dietitians` },
          ]}
        />
      </div>

      <div className="mt-6">
        <AdminCard title="All dietitians" sub="Check each DCN number. Switch off anyone whose number does not check out." flush>
          {practices.length === 0 ? (
            <p className="px-6 pb-6 text-sm text-ink-soft">No dietitians yet. They sign up at /dietitians.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-sm">
                <thead>
                  <tr className="border-y border-[#e3e9f1] bg-[#f7f9fc] text-left text-[11px] font-bold uppercase tracking-[0.06em] text-ink/50">
                    <th className="px-5 py-2.5">Dietitian</th>
                    <th className="px-3 py-2.5">DCN number</th>
                    <th className="px-3 py-2.5">Status</th>
                    <th className="px-3 py-2.5">Price a month</th>
                    <th className="px-3 py-2.5 text-right">Patients</th>
                    <th className="px-3 py-2.5">Joined</th>
                    <th className="px-5 py-2.5 text-right" />
                  </tr>
                </thead>
                <tbody>
                  {practices.map((p) => {
                    const st = statusOf(p);
                    const wa = whatsappNumber(p.contact_phone);
                    return (
                      <tr key={p.id} className="border-b border-[#eef2f7] align-top">
                        <td className="px-5 py-3">
                          <Link href={`/admin/dietitians/${p.id}`} className="font-semibold text-brand underline decoration-brand/30 underline-offset-2 hover:decoration-brand">
                            {p.name}
                          </Link>
                          <p className="text-xs text-ink-soft">
                            {[p.contact_phone, p.contact_email, p.city].filter(Boolean).join(" · ")}
                          </p>
                        </td>
                        <td className="px-3 py-3 font-mono text-xs text-ink">{p.dcn_number ?? "-"}</td>
                        <td className="px-3 py-3">
                          <span className={`inline-block rounded-full px-2.5 py-1 text-xs font-bold ${st.tone}`}>{st.label}</span>
                        </td>
                        <td className="px-3 py-3 text-ink">
                          {nairaText(patientPrice(p))}
                          <span className="block text-xs text-ink-soft">she gets {nairaText(dietitianShareNaira(patientPrice(p)))}</span>
                        </td>
                        <td className="px-3 py-3 text-right text-ink">
                          {counts.get(p.id)?.all ?? 0}
                          <span className="block text-xs text-ink-soft">{counts.get(p.id)?.paid ?? 0} with time left</span>
                        </td>
                        <td className="px-3 py-3 text-ink-soft">{shortDate(p.created_at)}</td>
                        <td className="px-5 py-3">
                          <div className="flex justify-end gap-2">
                            {wa && (
                              <a
                                href={`https://wa.me/${wa}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                aria-label={`WhatsApp ${p.name}`}
                                className="rounded-full border border-line px-3 py-1.5 text-xs font-bold text-ink hover:border-brand"
                              >
                                WhatsApp
                              </a>
                            )}
                            <Link
                              href={`/admin/dietitians/${p.id}#edit`}
                              aria-label={`Edit ${p.name}`}
                              className="rounded-full border border-line px-3 py-1.5 text-xs font-bold text-ink hover:border-brand"
                            >
                              Edit
                            </Link>
                            <DietitianSwitch id={p.id} name={p.name} off={p.status === "declined"} />
                          </div>
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
