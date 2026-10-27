import type { Metadata } from "next";
import Image from "next/image";
import { createAdminClient } from "@/lib/supabase/server";
import { doctorsReady } from "@/lib/careFeesServer";
import { loadFieldTeam, moneyFor, type DoctorStats, type FieldAgent } from "@/lib/fieldTeam";
import { ADVISOR_DIRECT_RATE, ADVISOR_RATE, AGENT_RATE, REP_PATIENT_SHARE, maskAccount, nairaFromKobo } from "@/lib/careFees";
import { PREMIUM_MONTHLY } from "@/lib/hospitalPlans";
import { SITE_URL } from "@/lib/site";
import AgentShare from "./AgentShare";
import DoctorFlyerButton from "@/components/hospital/DoctorFlyerButton";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "My GluFloat dashboard", robots: { index: false, follow: false } };

/**
 * A field agent's or advisor's own dashboard (founder, 2026-10-16). They do
 * not sign up, so there is no login: the secret link is the key, made in
 * /admin/agents, where a new one can replace it at any time. Counts and money
 * only. It never shows a patient's name or anything about their health, and
 * it can never change where the money goes (only GluFloat admin can).
 */
export default async function AgentDashboard({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const admin = createAdminClient();
  const ready = await doctorsReady(admin);
  const { data: me } = ready ? await admin.from("field_agents").select("*").eq("dash_token", token).maybeSingle() : { data: null };
  if (!me || (me as FieldAgent).status !== "active")
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f2f5f9] px-4">
        <p className="max-w-sm rounded-2xl bg-white p-6 text-center text-sm text-ink-soft shadow-sm">
          This link does not work. Please ask GluFloat for your dashboard link.
        </p>
      </main>
    );
  const agent = me as FieldAgent;
  const team = await loadFieldTeam(admin);
  const advisor = agent.role === "advisor";
  const myAgents = advisor ? team.agents.filter((a) => a.manager_id === agent.id) : [];
  const agentIds = new Set([agent.id, ...myAgents.map((a) => a.id)]);
  const myDoctors = team.doctors.filter((d) => d.agent_id && agentIds.has(d.agent_id) && d.status !== "declined");
  const own = myDoctors.filter((d) => d.agent_id === agent.id);
  const money = moneyFor(team, { agentId: agent.id });
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
  const thisMonth = money.earnings.filter((e) => e.earned_at >= monthStart).reduce((n, e) => n + e.amount, 0);
  const fee = (rate: number) => nairaFromKobo(Math.floor(PREMIUM_MONTHLY * 100 * rate));
  const first = agent.name.split(/\s+/)[0];

  // Patients who came through this rep's own PATIENT link (lib/repPatients.ts).
  // Counts only, never a name. Empty before rep-patients-schema.sql (#38).
  let linkPatients = 0;
  let linkPaying = 0;
  {
    const { data: rp } = await admin.from("rep_patients").select("user_id").eq("agent_id", agent.id);
    const ids = (rp ?? []).map((r) => r.user_id as string);
    linkPatients = ids.length;
    const now = new Date().toISOString();
    for (let i = 0; i < ids.length; i += 100) {
      const { count } = await admin
        .from("subscriptions")
        .select("user_id", { count: "exact", head: true })
        .in("user_id", ids.slice(i, i + 100))
        .in("status", ["active", "non-renewing"])
        .gt("current_period_end", now);
      linkPaying += count ?? 0;
    }
  }

  const tiles = [
    { label: "To be paid", value: nairaFromKobo(money.owed + money.sending), sub: "paid to your bank every week" },
    { label: "This month", value: nairaFromKobo(thisMonth), sub: "earned so far" },
    { label: "Paid to you", value: nairaFromKobo(money.paid), sub: "all time" },
  ];

  const DoctorList = ({ list }: { list: DoctorStats[] }) =>
    list.length === 0 ? (
      <p className="px-5 py-6 text-center text-sm text-ink-soft">No doctors yet.</p>
    ) : (
      <ul className="divide-y divide-[#eef2f7]">
        {list.map((d) => (
          <li key={d.id} className="flex items-center justify-between gap-3 px-5 py-3 text-sm">
            <div className="min-w-0">
              <p className="truncate font-semibold text-ink">{d.name}</p>
              <p className="text-xs text-ink-soft">
                Joined {new Date(d.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                {d.setUp ? "" : " · has not finished setting up"}
              </p>
              <div className="mt-2">
                <DoctorFlyerButton name={d.name} code={d.code} />
              </div>
            </div>
            <div className="shrink-0 text-right text-xs text-ink-soft">
              <p>
                <span className="font-display text-base font-bold text-ink">{d.patients}</span> patients
              </p>
              <p>
                <span className="font-bold text-leaf-deep">{d.paying}</span> paying
              </p>
            </div>
          </li>
        ))}
      </ul>
    );

  return (
    <main className="min-h-screen bg-[#f2f5f9] pb-16">
      <header className="bg-gradient-to-br from-[#0d3568] via-[#14538f] to-[#1b5faa] px-4 pb-8 pt-6 text-white sm:px-6">
        <div className="mx-auto max-w-4xl">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white">
              <Image src="/logo-mark.png" alt="" width={24} height={24} className="h-6 w-6" />
            </span>
            <span className="font-display text-lg font-bold">GluFloat</span>
          </div>
          <h1 className="mt-6 font-display text-2xl font-bold sm:text-3xl">Hello, {first}</h1>
          <p className="mt-1 text-sm text-white/80">{advisor ? "Advisor" : "Doctor acquisition rep"} · your doctors and your money</p>
          <div className="mt-5">
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.1em] text-white/70">Your link for doctors</p>
            <AgentShare link={`${SITE_URL}/d/${agent.ref_code}`} />
          </div>
          <div className="mt-5">
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.1em] text-white/70">Your link for patients</p>
            <AgentShare link={`${SITE_URL}/p/${agent.ref_code}`} forPatients />
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-4xl px-4 sm:px-6">
        <div className="-mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
          {tiles.map((t) => (
            <div key={t.label} className="rounded-2xl border border-[#e3e9f1] bg-white p-4 shadow-sm sm:p-5">
              <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-ink/50">{t.label}</p>
              <p className="mt-2 font-display text-2xl font-bold leading-none text-ink sm:text-3xl">{t.value}</p>
              <p className="mt-2 text-xs text-ink-soft">{t.sub}</p>
            </div>
          ))}
        </div>

        <p className="mt-4 rounded-2xl bg-brand/[0.06] px-4 py-3 text-sm text-ink ring-1 ring-inset ring-brand/10">
          {advisor
            ? `For each paying patient, every month, for the patient's first 12 months, you earn ${fee(ADVISOR_DIRECT_RATE)} on doctors you bring yourself and ${fee(ADVISOR_RATE)} on doctors your reps bring.`
            : `You earn ${fee(AGENT_RATE)} for each paying patient of the doctors you bring, every month, for the patient's first 12 months.`}{" "}
          {agent.account_number
            ? `Paid every week to ${agent.account_name ?? ""} (${agent.bank_name ?? ""} ${maskAccount(agent.account_number)}).`
            : "Send GluFloat your bank details so we can pay you."}
        </p>

        <section className="mt-6 rounded-2xl border border-[#e3e9f1] bg-white">
          <h2 className="border-b border-[#eef2f7] px-5 py-4 font-display text-lg font-bold text-ink">Patients from your patient link</h2>
          <div className="flex items-center justify-between gap-3 px-5 py-4 text-sm">
            <p className="text-ink-soft">
              You earn {fee(REP_PATIENT_SHARE)} each month for each patient who joins with your patient link and pays for GluFloat
              Premium, for their first 12 months. On other plans, you earn a third of what they pay.
            </p>
            <div className="shrink-0 text-right text-xs text-ink-soft">
              <p>
                <span className="font-display text-base font-bold text-ink">{linkPatients}</span> joined
              </p>
              <p>
                <span className="font-bold text-leaf-deep">{linkPaying}</span> paying
              </p>
            </div>
          </div>
        </section>

        {advisor && (
          <section className="mt-6 rounded-2xl border border-[#e3e9f1] bg-white">
            <h2 className="border-b border-[#eef2f7] px-5 py-4 font-display text-lg font-bold text-ink">Your reps</h2>
            {myAgents.length === 0 ? (
              <p className="px-5 py-6 text-center text-sm text-ink-soft">No reps yet. GluFloat adds them for you.</p>
            ) : (
              <ul className="divide-y divide-[#eef2f7]">
                {myAgents.map((a) => {
                  const docs = myDoctors.filter((d) => d.agent_id === a.id);
                  return (
                    <li key={a.id} className="flex items-center justify-between gap-3 px-5 py-3 text-sm">
                      <p className="font-semibold text-ink">
                        {a.name}
                        {a.status !== "active" && <span className="ml-2 text-xs font-normal text-ink-soft">switched off</span>}
                      </p>
                      <p className="text-xs text-ink-soft">
                        <span className="font-bold text-ink">{docs.length}</span> doctors ·{" "}
                        <span className="font-bold text-leaf-deep">{docs.reduce((n, d) => n + d.paying, 0)}</span> paying patients
                      </p>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        )}

        <section className="mt-6 rounded-2xl border border-[#e3e9f1] bg-white">
          <h2 className="border-b border-[#eef2f7] px-5 py-4 font-display text-lg font-bold text-ink">
            {advisor ? "Your doctors and your reps' doctors" : "Your doctors"}
          </h2>
          <DoctorList list={advisor ? myDoctors : own} />
        </section>

        <section className="mt-6 rounded-2xl border border-[#e3e9f1] bg-white">
          <h2 className="border-b border-[#eef2f7] px-5 py-4 font-display text-lg font-bold text-ink">Payments to you</h2>
          {money.payouts.filter((p) => p.status === "paid").length === 0 ? (
            <p className="px-5 py-6 text-center text-sm text-ink-soft">No payments yet.</p>
          ) : (
            <ul className="divide-y divide-[#eef2f7]">
              {money.payouts
                .filter((p) => p.status === "paid")
                .map((p) => (
                  <li key={p.id} className="flex items-center justify-between px-5 py-3 text-sm">
                    <span className="text-ink-soft">
                      {new Date(p.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                    </span>
                    <span className="font-display font-bold text-ink">{nairaFromKobo(p.amount)}</span>
                  </li>
                ))}
            </ul>
          )}
        </section>
        <p className="mt-6 text-center text-xs text-ink-soft">Keep this link private. Need help? Call or WhatsApp GluFloat on 0813 209 7317.</p>
      </div>
    </main>
  );
}
