import { Handshake } from "lucide-react";
import { isAdmin } from "@/lib/adminSession";
import { createAdminClient } from "@/lib/supabase/server";
import AdminLogin from "../AdminLogin";
import AdminShell from "../AdminShell";
import AdminHero from "../AdminHero";
import BankDetailsForm from "@/components/BankDetailsForm";
import FoldCard from "@/components/FoldCard";
import { doctorsReady } from "@/lib/careFeesServer";
import { loadFieldTeam, moneyFor } from "@/lib/fieldTeam";
import { nairaFromKobo } from "@/lib/careFees";
import { listBanks } from "@/lib/paystackBanks";
import { SITE_URL } from "@/lib/site";
import { AddAgentForm, AgentLinks } from "./AgentControls";

export const dynamic = "force-dynamic";

/**
 * Field agents and advisors (founder, 2026-10-16). They do not sign up:
 * GluFloat adds them here, and each gets a link for doctors and a private
 * dashboard link, sent to them on WhatsApp from this page.
 */
export default async function AgentsAdminPage() {
  if (!(await isAdmin())) return <AdminLogin />;
  const admin = createAdminClient();
  if (!(await doctorsReady(admin)))
    return (
      <AdminShell title="Doctor acquisition reps" icon={<Handshake className="h-5 w-5" />}>
        <div className="mt-6 rounded-2xl border border-[#e3e9f1] bg-white p-6 text-sm text-ink-soft">
          Waiting for the database update. Paste <code className="font-mono text-ink">supabase/doctors-schema.sql</code> into the
          Supabase SQL editor (#31 in SETUP.md).
        </div>
      </AdminShell>
    );

  const [team, banks] = await Promise.all([loadFieldTeam(admin), listBanks()]);
  const advisors = team.agents.filter((a) => a.role === "advisor");
  const nameOf = new Map(team.agents.map((a) => [a.id, a.name]));
  const owed = team.agents.reduce((n, a) => n + moneyFor(team, { agentId: a.id }).owed, 0);

  // A person's doctors: their own for an agent; their agents' for an advisor.
  const doctorsOf = (id: string, role: "agent" | "advisor") => {
    const agentIds = role === "advisor" ? new Set([id, ...team.agents.filter((a) => a.manager_id === id).map((a) => a.id)]) : new Set([id]);
    return team.doctors.filter((d) => d.agent_id && agentIds.has(d.agent_id));
  };

  const people = [...advisors, ...team.agents.filter((a) => a.role === "agent")];

  return (
    <AdminShell title="Doctor acquisition reps" subtitle="Reps and advisors who bring doctors" icon={<Handshake className="h-5 w-5" />}>
      <div className="mt-6">
        <AdminHero
          items={[
            { label: "Doctor acquisition reps", value: String(team.agents.filter((a) => a.role === "agent" && a.status === "active").length), sub: "switched on" },
            { label: "Advisors", value: String(advisors.filter((a) => a.status === "active").length), sub: "switched on" },
            { label: "Doctors they brought", value: String(team.doctors.filter((d) => d.agent_id).length), sub: `of ${team.doctors.length} doctors` },
            { label: "Owed to them", value: nairaFromKobo(owed), sub: "see Payouts" },
          ]}
        />
      </div>

      {/* Used now and then: folded once there is anybody on the list. */}
      <FoldCard className="mt-6" title="Add a doctor acquisition rep or advisor" sub="Add the advisor first, then their reps." open={people.length === 0}>
        <AddAgentForm advisors={advisors.filter((a) => a.status === "active").map((a) => ({ id: a.id, name: a.name }))} />
      </FoldCard>

      <div className="mt-6 space-y-3">
        {people.length === 0 && (
          <p className="rounded-2xl border border-[#e3e9f1] bg-white p-6 text-sm text-ink-soft">Nobody yet. Add your first advisor or agent above.</p>
        )}
        {people.map((a) => {
          const docs = doctorsOf(a.id, a.role);
          const m = moneyFor(team, { agentId: a.id });
          const off = a.status === "off";
          return (
            // One row per person, folded: name, who they are, doctors and money
            // owed stay visible; links, bank and the doctor list open on tap.
            <FoldCard
              key={a.id}
              className={off ? "opacity-70" : ""}
              title={a.name}
              sub={`${a.role === "advisor" ? "Advisor" : "Doctor acquisition rep"}${a.manager_id ? ` · advisor: ${nameOf.get(a.manager_id) ?? "-"}` : ""}${a.phone ? ` · ${a.phone}` : ""}${off ? " · Switched off" : ""}`}
              meta={
                <>
                  <span className="block font-semibold text-ink">{docs.length} {docs.length === 1 ? "doctor" : "doctors"}</span>
                  <span className="block">{nairaFromKobo(m.owed)} owed</span>
                </>
              }
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-[0.06em] text-ink/50">Doctors</p>
                    <p className="font-display text-xl font-bold text-ink">{docs.length}</p>
                  </div>
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-[0.06em] text-ink/50">Paying patients</p>
                    <p className="font-display text-xl font-bold text-ink">{docs.reduce((n, d) => n + d.paying, 0)}</p>
                  </div>
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-[0.06em] text-ink/50">Owed / paid</p>
                    <p className="font-display text-xl font-bold text-ink">
                      {nairaFromKobo(m.owed)} <span className="text-sm text-ink-soft">/ {nairaFromKobo(m.paid)}</span>
                    </p>
                  </div>
                </div>
              </div>
              <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_340px]">
                <AgentLinks
                  id={a.id}
                  name={a.name}
                  phone={a.phone}
                  email={a.email ?? null}
                  role={a.role}
                  managerId={a.manager_id ?? null}
                  advisors={advisors.filter((x) => x.status === "active").map((x) => ({ id: x.id, name: x.name }))}
                  doctorLink={`${SITE_URL}/d/${a.ref_code}`}
                  dashLink={`${SITE_URL}/agent/${a.dash_token}`}
                  off={off}
                />
                <BankDetailsForm
                  banks={banks}
                  endpoint="/api/admin/agents/bank"
                  extra={{ agentId: a.id }}
                  title="Their bank"
                  saved={{ bankName: a.bank_name, accountShown: a.account_number, accountName: a.account_name }}
                />
              </div>
              {docs.length > 0 && (
                <p className="mt-3 text-xs text-ink-soft">
                  Doctors: {docs.map((d) => `${d.name} (${d.paying} paying)`).join(", ")}
                </p>
              )}
            </FoldCard>
          );
        })}
      </div>
    </AdminShell>
  );
}
