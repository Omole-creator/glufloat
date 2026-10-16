import Link from "next/link";
import { Hospital } from "lucide-react";
import { isAdmin } from "@/lib/adminSession";
import { createAdminClient } from "@/lib/supabase/server";
import AdminLogin from "../AdminLogin";
import AdminShell from "../AdminShell";
import AdminHero from "../AdminHero";
import AdminCard from "../AdminCard";
import { hospitalLive, planById, planName, nairaText } from "@/lib/hospitalPlans";
import { hospitalsReady, type HospitalRow } from "@/lib/hospitalServer";
import { readInvoiceSettings } from "@/lib/invoiceSettings";
import RequestActions from "./RequestActions";
import InvoiceSettingsForm from "./InvoiceSettingsForm";
import AddHospital from "./AddHospital";
import TestEmail from "./TestEmail";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<HospitalRow["status"], string> = {
  requested: "New request",
  pilot: "Free pilot",
  active: "Paying",
  ended: "Ended",
  declined: "Declined",
};

const STATUS_TONE: Record<HospitalRow["status"], string> = {
  requested: "bg-verdict-yellow/20 text-ink",
  pilot: "bg-brand/10 text-brand",
  active: "bg-leaf/10 text-leaf-deep",
  ended: "bg-ink/5 text-ink-soft",
  declined: "bg-ink/5 text-ink-soft",
};

function shortDate(iso: string | null): string {
  if (!iso) return "-";
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export default async function HospitalsAdminPage() {
  if (!(await isAdmin())) return <AdminLogin />;
  const admin = createAdminClient();

  if (!(await hospitalsReady(admin))) {
    return (
      <AdminShell title="Hospitals" icon={<Hospital className="h-5 w-5" />}>
        <div className="mt-6 rounded-2xl border border-[#e3e9f1] bg-white p-6 text-sm text-ink-soft">
          Waiting for the database update. Paste <code className="font-mono text-ink">supabase/hospitals-schema.sql</code>{" "}
          into the Supabase SQL editor (#22 in SETUP.md).
        </div>
      </AdminShell>
    );
  }

  const [{ data: hs }, { data: pats }, settings] = await Promise.all([
    admin.from("hospitals").select("*").order("created_at", { ascending: false }),
    admin.from("hospital_patients").select("hospital_id,status").in("status", ["active", "waiting", "invited"]),
    readInvoiceSettings(admin),
  ]);
  // Dietitians' practices live in /admin/dietitians, not here.
  const hospitals = ((hs ?? []) as HospitalRow[]).filter((h) => h.kind !== "dietitian" && h.kind !== "doctor");
  const counts = new Map<string, { active: number; waiting: number; invited: number }>();
  for (const p of pats ?? []) {
    const c = counts.get(p.hospital_id as string) ?? { active: 0, waiting: 0, invited: 0 };
    c[p.status as "active" | "waiting" | "invited"]++;
    counts.set(p.hospital_id as string, c);
  }

  const requests = hospitals.filter((h) => h.status === "requested");
  // Declined ones stay listed so they can be opened and deleted.
  const rest = hospitals.filter((h) => h.status !== "requested");
  const live = rest.filter((h) => hospitalLive(h));
  const paying = live.filter((h) => h.status === "active");
  const covered = live.reduce((n, h) => n + (counts.get(h.id)?.active ?? 0), 0);
  // A month's worth of hospital money: a yearly plan counts as a twelfth of
  // its yearly price (10 months' price), the same rule /admin uses for people.
  const monthly = paying.reduce((n, h) => {
    const p = planById(h.plan);
    if (!p) return n;
    return n + (h.billing === "annual" ? (p.monthly * 10) / 12 : p.monthly);
  }, 0);

  return (
    <AdminShell title="Hospitals" subtitle="GluFloat for hospitals" icon={<Hospital className="h-5 w-5" />} actions={<AddHospital />}>
      <div className="mt-6">
        <AdminHero
          items={[
            { label: "New requests", value: String(requests.length), sub: "waiting for you" },
            { label: "Free pilots", value: String(live.filter((h) => h.status === "pilot").length), sub: "running now" },
            { label: "Paying hospitals", value: String(paying.length), sub: `${nairaText(monthly)} a month` },
            { label: "Patients covered", value: covered.toLocaleString(), sub: "using a place now" },
          ]}
        />
      </div>

      {requests.length > 0 && (
        <div className="mt-6">
          <AdminCard title="New requests" sub="From the form on /hospitals. Approving starts a free 30-day pilot for 20 patients.">
            <div className="space-y-3">
              {requests.map((h) => (
                <div key={h.id} className="rounded-xl border border-[#e3e9f1] p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <Link href={`/admin/hospitals/${h.id}`} className="font-display text-base font-bold text-ink hover:text-brand hover:underline">
                        {h.name}
                      </Link>
                      <p className="mt-0.5 text-sm text-ink-soft">
                        {[h.contact_name, h.contact_role].filter(Boolean).join(", ")}
                        {h.city || h.state ? ` · ${[h.city, h.state].filter(Boolean).join(", ")}` : ""}
                      </p>
                      <p className="mt-1 text-sm text-ink">
                        {h.contact_phone} · {h.contact_email}
                        {h.est_patients ? ` · about ${h.est_patients.toLocaleString()} patients with diabetes` : ""}
                      </p>
                      {h.message && <p className="mt-2 rounded-lg bg-mist/70 px-3 py-2 text-sm text-ink">{h.message}</p>}
                      <p className="mt-1.5 text-xs text-ink-soft">Asked on {shortDate(h.created_at)}</p>
                    </div>
                    <RequestActions id={h.id} contactName={h.contact_name} contactPhone={h.contact_phone} hospitalName={h.name} />
                  </div>
                </div>
              ))}
            </div>
          </AdminCard>
        </div>
      )}

      <div className="mt-6">
        <AdminCard title="All hospitals" sub="Open a hospital to make its quote or invoice, get its QR code, or edit it." flush>
          {rest.length === 0 ? (
            <p className="px-6 pb-6 text-sm text-ink-soft">
              No hospitals yet. Use &ldquo;Add a hospital&rdquo; at the top, or approve a request. Then open it to make its
              quote or invoice.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-sm">
                <thead>
                  <tr className="border-y border-[#e3e9f1] bg-[#f7f9fc] text-left text-[11px] font-bold uppercase tracking-[0.06em] text-ink/50">
                    <th className="px-5 py-2.5">Hospital</th>
                    <th className="px-3 py-2.5">Status</th>
                    <th className="px-3 py-2.5">Plan</th>
                    <th className="px-3 py-2.5">Places used</th>
                    <th className="px-3 py-2.5">Waiting</th>
                    <th className="px-5 py-2.5">Open until</th>
                  </tr>
                </thead>
                <tbody>
                  {rest.map((h) => {
                    const c = counts.get(h.id) ?? { active: 0, waiting: 0, invited: 0 };
                    const lapsed = (h.status === "pilot" || h.status === "active") && !hospitalLive(h);
                    return (
                      <tr key={h.id} className="border-b border-[#eef2f7] last:border-0 hover:bg-[#f7f9fc]">
                        <td className="px-5 py-3">
                          <Link href={`/admin/hospitals/${h.id}`} className="font-semibold text-brand hover:underline">
                            {h.name}
                          </Link>
                          <p className="text-xs text-ink-soft">{[h.city, h.state].filter(Boolean).join(", ")}</p>
                        </td>
                        <td className="px-3 py-3">
                          <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${lapsed ? "bg-verdict-red/10 text-verdict-red" : STATUS_TONE[h.status]}`}>
                            {lapsed ? "Out of time" : STATUS_LABEL[h.status]}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-ink">{planName(h.plan)}{h.billing === "annual" ? ", yearly" : ""}</td>
                        <td className="px-3 py-3 text-ink">
                          {c.active} of {h.seats}
                        </td>
                        <td className="px-3 py-3 text-ink">{c.waiting || "-"}</td>
                        <td className="px-5 py-3 text-ink">{shortDate(h.access_until)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </AdminCard>
      </div>

      <div className="mt-6">
        <AdminCard title="Invoice settings and alerts" sub="Printed on every hospital quote and invoice. New requests are emailed to glufloat@gmail.com.">
          <InvoiceSettingsForm initial={settings} />
          <div className="mt-5 border-t border-[#eef2f7] pt-4">
            <TestEmail />
          </div>
        </AdminCard>
      </div>
    </AdminShell>
  );
}
