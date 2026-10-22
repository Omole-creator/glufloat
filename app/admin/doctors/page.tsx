import { Stethoscope } from "lucide-react";
import { isAdmin } from "@/lib/adminSession";
import { createAdminClient } from "@/lib/supabase/server";
import AdminLogin from "../AdminLogin";
import AdminShell from "../AdminShell";
import AdminHero from "../AdminHero";
import AdminCard from "../AdminCard";
import { doctorsReady } from "@/lib/careFeesServer";
import { loadFieldTeam, moneyFor } from "@/lib/fieldTeam";
import { nairaFromKobo } from "@/lib/careFees";
import { isInternalEmail } from "@/lib/internalAccounts";
import FoldCard from "@/components/FoldCard";
import { AddDoctorForm, DoctorActions } from "./DoctorControls";

export const dynamic = "force-dynamic";

function shortDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

/**
 * GluFloat for doctors, from GluFloat's side (2026-10-16). Doctors sign up
 * through a field agent's or a colleague's link, or GluFloat adds them here
 * (2026-10-17, no field agent needed); nothing is approved by hand. This is
 * where to see them, check MDCN numbers, edit, switch off or delete one.
 */
export default async function DoctorsAdminPage() {
  if (!(await isAdmin())) return <AdminLogin />;
  const admin = createAdminClient();
  if (!(await doctorsReady(admin)))
    return (
      <AdminShell title="Doctors" icon={<Stethoscope className="h-5 w-5" />}>
        <div className="mt-6 rounded-2xl border border-[#e3e9f1] bg-white p-6 text-sm text-ink-soft">
          Waiting for the database update. Paste <code className="font-mono text-ink">supabase/doctors-schema.sql</code> into the
          Supabase SQL editor (#31 in SETUP.md).
        </div>
      </AdminShell>
    );

  const team = await loadFieldTeam(admin);
  const doctors = team.doctors.filter((d) => !isInternalEmail(d.contact_email ?? ""));
  const agentName = new Map(team.agents.map((a) => [a.id, a.name]));
  const doctorName = new Map(team.doctors.map((d) => [d.id, d.name]));
  const on = doctors.filter((d) => d.status !== "declined");

  return (
    <AdminShell title="Doctors" subtitle="GluFloat for doctors" icon={<Stethoscope className="h-5 w-5" />}>
      <div className="mt-6">
        <AdminHero
          items={[
            { label: "Doctors", value: String(on.length), sub: `${on.filter((d) => d.setUp).length} finished setting up` },
            { label: "Their patients", value: String(on.reduce((n, d) => n + d.patients, 0)), sub: "joined so far" },
            { label: "On Premium", value: String(on.reduce((n, d) => n + d.paying, 0)), sub: "paying now" },
            {
              label: "Owed to doctors",
              value: nairaFromKobo(on.reduce((n, d) => n + moneyFor(team, { hospitalId: d.id }).owed, 0)),
              sub: "see Payouts",
            },
          ]}
        />
      </div>

      {/* Used now and then: folded once there is anybody on the list. */}
      <FoldCard className="mt-6" title="Add a doctor" sub="No doctor acquisition rep needed. They get an email to set their password." open={doctors.length === 0}>
        <AddDoctorForm
          agents={team.agents.filter((a) => a.status === "active").map((a) => ({ id: a.id, name: a.name, role: a.role }))}
        />
      </FoldCard>

      <div className="mt-6">
        <AdminCard title="All doctors" sub="Check each MDCN number. Switch off anyone whose number does not check out." flush>
          {doctors.length === 0 ? (
            <p className="px-6 pb-6 text-sm text-ink-soft">No doctors yet. Add one above, or they sign up with a doctor acquisition rep&apos;s link.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1100px] text-sm">
                <thead>
                  <tr className="border-y border-[#e3e9f1] bg-[#f7f9fc] text-left text-[11px] font-bold uppercase tracking-[0.06em] text-ink/50">
                    <th className="px-5 py-2.5">Doctor</th>
                    <th className="px-3 py-2.5">MDCN number</th>
                    <th className="px-3 py-2.5">Brought by</th>
                    <th className="px-3 py-2.5 text-right">Patients</th>
                    <th className="px-3 py-2.5 text-right">On Premium</th>
                    <th className="px-3 py-2.5 text-right">Owed</th>
                    <th className="px-3 py-2.5 text-right">Paid</th>
                    <th className="px-3 py-2.5">Bank</th>
                    <th className="px-3 py-2.5">Joined</th>
                  </tr>
                </thead>
                <tbody>
                  {doctors.map((d) => {
                    const m = moneyFor(team, { hospitalId: d.id });
                    return (
                      <tr key={d.id} className={`border-b border-[#eef2f7] align-top ${d.status === "declined" ? "opacity-60" : ""}`}>
                        <td className="px-5 py-3">
                          <p className="font-semibold text-ink">{d.name}</p>
                          <p className="text-xs text-ink-soft">
                            {d.contact_email}
                            {!d.setUp && " · not set up yet"}
                            {d.status === "declined" && " · switched off"}
                          </p>
                          <div className="mt-2.5">
                            <DoctorActions
                              id={d.id}
                              name={d.name}
                              email={d.contact_email ?? ""}
                              mdcn={d.mdcn_number ?? ""}
                              off={d.status === "declined"}
                            />
                          </div>
                        </td>
                        <td className="px-3 py-3 font-mono text-xs">{d.mdcn_number ?? "-"}</td>
                        <td className="px-3 py-3 text-xs">
                          {d.agent_id
                            ? agentName.get(d.agent_id) ?? "An agent"
                            : d.invited_by
                              ? `Colleague: ${doctorName.get(d.invited_by) ?? "a doctor"}`
                              : "Nobody"}
                        </td>
                        <td className="px-3 py-3 text-right">{d.patients}</td>
                        <td className="px-3 py-3 text-right">{d.paying}</td>
                        <td className="px-3 py-3 text-right font-semibold">{nairaFromKobo(m.owed + m.sending)}</td>
                        <td className="px-3 py-3 text-right">{nairaFromKobo(m.paid)}</td>
                        <td className="px-3 py-3 text-xs">
                          {d.account_number ? (
                            <>
                              <p className="font-semibold text-ink">{d.account_name}</p>
                              <p className="font-mono text-ink-soft">
                                {d.bank_name} · {d.account_number}
                              </p>
                            </>
                          ) : (
                            <span className="text-ink-soft">Not added yet</span>
                          )}
                        </td>
                        <td className="px-3 py-3 text-xs">{shortDate(d.created_at)}</td>

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
