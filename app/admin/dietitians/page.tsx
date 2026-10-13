import { Stethoscope } from "lucide-react";
import { isAdmin } from "@/lib/adminSession";
import { createAdminClient } from "@/lib/supabase/server";
import AdminLogin from "../AdminLogin";
import AdminShell from "../AdminShell";
import AdminHero from "../AdminHero";
import AdminCard from "../AdminCard";
import Link from "next/link";
import {
  hospitalLive,
  nairaText,
  practicePlanById,
  practicePlanName,
  practiceYearly,
  PRACTICE_CUSTOM_PER_PATIENT,
  waitingForFirstPatient,
} from "@/lib/hospitalPlans";
import { whatsappNumber, type HospitalRow } from "@/lib/hospitalServer";
import { isInternalEmail } from "@/lib/internalAccounts";
import DietitianSwitch from "./DietitianSwitch";

export const dynamic = "force-dynamic";

/**
 * GluFloat for dietitians, from GluFloat's side (2026-10-13). Dietitians sign
 * up themselves at /dietitians/start; this is where their DCN numbers are
 * checked and where one that does not check out is switched off. Payments
 * are Paystack, so there is nothing to invoice here.
 */

function shortDate(iso: string | null): string {
  if (!iso) return "-";
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function statusOf(p: HospitalRow): { label: string; tone: string } {
  if (p.status === "declined") return { label: "Switched off", tone: "bg-verdict-red/10 text-verdict-red" };
  if (waitingForFirstPatient(p)) return { label: "No patient yet", tone: "bg-verdict-yellow/20 text-ink" };
  if (!hospitalLive(p)) return { label: `Ended ${shortDate(p.access_until)}`, tone: "bg-ink/5 text-ink-soft" };
  if (p.status === "pilot") return { label: `Free until ${shortDate(p.access_until)}`, tone: "bg-brand/10 text-brand" };
  return { label: `Paid until ${shortDate(p.access_until)}`, tone: "bg-leaf/10 text-leaf-deep" };
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

  const [{ data: ps }, { data: pats }] = await Promise.all([
    admin.from("hospitals").select("*").eq("kind", "dietitian").order("created_at", { ascending: false }),
    admin.from("hospital_patients").select("hospital_id,status").in("status", ["active", "waiting", "invited"]),
  ]);
  // Test accounts (any @glufloat.com email) are left out, like every admin number.
  const practices = ((ps ?? []) as HospitalRow[]).filter((p) => !isInternalEmail(p.contact_email ?? ""));
  const counts = new Map<string, number>();
  for (const p of pats ?? []) if (p.status === "active") counts.set(p.hospital_id as string, (counts.get(p.hospital_id as string) ?? 0) + 1);

  const on = practices.filter((p) => p.status !== "declined");
  const live = on.filter((p) => hospitalLive(p));
  const paying = live.filter((p) => p.status === "active");
  const covered = live.reduce((n, p) => n + (counts.get(p.id) ?? 0), 0);
  // A yearly plan counts as a twelfth of its yearly price, like hospitals.
  const monthlyValue = paying.reduce((n, p) => {
    const plan = practicePlanById(p.plan);
    // A custom plan is counted at its places times N1,600 (the invoice may differ).
    const monthly = plan ? plan.monthly : p.plan === "custom" ? p.seats * PRACTICE_CUSTOM_PER_PATIENT : 0;
    const yearlyPrice = plan ? practiceYearly(plan) : monthly * 10;
    return n + (p.billing === "annual" ? yearlyPrice / 12 : monthly);
  }, 0);

  return (
    <AdminShell title="Dietitians" subtitle="GluFloat for dietitians" icon={<Stethoscope className="h-5 w-5" />}>
      <div className="mt-6">
        <AdminHero
          items={[
            { label: "Dietitians", value: String(on.length), sub: `${on.filter((p) => waitingForFirstPatient(p)).length} with no patient yet` },
            { label: "Free days running", value: String(live.filter((p) => p.status === "pilot").length), sub: "first patient joined" },
            { label: "Paying", value: String(paying.length), sub: `${nairaText(monthlyValue)} a month` },
            { label: "Patients covered", value: covered.toLocaleString(), sub: "using a place now" },
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
                    <th className="px-3 py-2.5">Plan</th>
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
                          {p.plan && p.plan !== "pilot" ? `${practicePlanName(p.plan)}${p.billing === "annual" ? ", yearly" : ""}` : "Free days"}
                        </td>
                        <td className="px-3 py-3 text-right text-ink">
                          {counts.get(p.id) ?? 0} of {p.seats}
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
                              href={`/admin/hospitals/${p.id}`}
                              aria-label={`Custom plan invoice for ${p.name}`}
                              className="rounded-full border border-line px-3 py-1.5 text-xs font-bold text-ink hover:border-brand"
                            >
                              Invoice
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
