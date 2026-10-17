import { Wallet } from "lucide-react";
import { isAdmin } from "@/lib/adminSession";
import { createAdminClient } from "@/lib/supabase/server";
import AdminLogin from "../AdminLogin";
import AdminShell from "../AdminShell";
import AdminHero from "../AdminHero";
import AdminCard from "../AdminCard";
import FoldCard from "@/components/FoldCard";
import { doctorsReady } from "@/lib/careFeesServer";
import { loadFieldTeam, unpaidEarnings } from "@/lib/fieldTeam";
import { nairaFromKobo, weekStartWAT } from "@/lib/careFees";
import MarkPaid from "./MarkPaid";

export const dynamic = "force-dynamic";

/**
 * Weekly payouts (founder, 2026-10-16: every week, no minimum). Everyone
 * owed money, with the bank account it goes to. Send it, then "Mark as paid".
 * Nothing here sends money by itself.
 */
export default async function PayoutsAdminPage() {
  if (!(await isAdmin())) return <AdminLogin />;
  const admin = createAdminClient();
  if (!(await doctorsReady(admin)))
    return (
      <AdminShell title="Payouts" icon={<Wallet className="h-5 w-5" />}>
        <div className="mt-6 rounded-2xl border border-[#e3e9f1] bg-white p-6 text-sm text-ink-soft">
          Waiting for the database update. Paste <code className="font-mono text-ink">supabase/doctors-schema.sql</code> into the
          Supabase SQL editor (#31 in SETUP.md).
        </div>
      </AdminShell>
    );

  const team = await loadFieldTeam(admin);
  // Dietitians are paid their share of their patients' payments the same way
  // (patient-pays-schema.sql): their rows in clinician_earnings carry the
  // practice as hospital_id, exactly like a doctor's.
  const { data: dietRows } = await admin
    .from("hospitals")
    .select("id,name,bank_name,account_number,account_name")
    .eq("kind", "dietitian");
  const dietitians = (dietRows ?? []) as { id: string; name: string; bank_name: string | null; account_number: string | null; account_name: string | null }[];
  type Owed = {
    key: string;
    who: { hospitalId: string } | { agentId: string };
    name: string;
    role: string;
    bank: string | null;
    account: string | null;
    accountName: string | null;
    ids: string[];
    amount: number;
  };
  const owed: Owed[] = [];
  for (const d of team.doctors) {
    const rows = unpaidEarnings(team, { hospitalId: d.id });
    if (rows.length)
      owed.push({
        key: `h${d.id}`,
        who: { hospitalId: d.id },
        name: d.name,
        role: "Doctor",
        bank: d.bank_name,
        account: d.account_number,
        accountName: d.account_name,
        ids: rows.map((r) => r.id),
        amount: rows.reduce((n, r) => n + r.amount, 0),
      });
  }
  for (const d of dietitians) {
    const rows = unpaidEarnings(team, { hospitalId: d.id });
    if (rows.length)
      owed.push({
        key: `h${d.id}`,
        who: { hospitalId: d.id },
        name: d.name,
        role: "Dietitian",
        bank: d.bank_name,
        account: d.account_number,
        accountName: d.account_name,
        ids: rows.map((r) => r.id),
        amount: rows.reduce((n, r) => n + r.amount, 0),
      });
  }
  for (const a of team.agents) {
    const rows = unpaidEarnings(team, { agentId: a.id });
    if (rows.length)
      owed.push({
        key: `a${a.id}`,
        who: { agentId: a.id },
        name: a.name,
        role: a.role === "advisor" ? "Advisor" : "Field agent",
        bank: a.bank_name,
        account: a.account_number,
        accountName: a.account_name,
        ids: rows.map((r) => r.id),
        amount: rows.reduce((n, r) => n + r.amount, 0),
      });
  }
  owed.sort((x, y) => y.amount - x.amount);
  const total = owed.reduce((n, o) => n + o.amount, 0);
  const paidThisWeek = team.payouts
    .filter((p) => p.status === "paid" && new Date(p.created_at) >= weekStartWAT(new Date()))
    .reduce((n, p) => n + p.amount, 0);
  const nameOf = new Map<string, string>([
    ...team.doctors.map((d) => [d.id, d.name] as [string, string]),
    ...dietitians.map((d) => [d.id, d.name] as [string, string]),
    ...team.agents.map((a) => [a.id, a.name] as [string, string]),
  ]);

  return (
    <AdminShell title="Payouts" subtitle="Money owed to doctors, dietitians, field agents and advisors, every week" icon={<Wallet className="h-5 w-5" />}>
      <div className="mt-6">
        <AdminHero
          items={[
            { label: "To pay now", value: nairaFromKobo(total), sub: `${owed.length} ${owed.length === 1 ? "person" : "people"}` },
            { label: "Paid this week", value: nairaFromKobo(paidThisWeek), sub: "since Monday" },
            { label: "Paid in total", value: nairaFromKobo(team.payouts.filter((p) => p.status === "paid").reduce((n, p) => n + p.amount, 0)), sub: "all time" },
          ]}
        />
      </div>

      <div className="mt-6">
        <AdminCard title="To pay" sub="Send each amount to the account shown, then mark it as paid." flush>
          {owed.length === 0 ? (
            <p className="px-6 pb-6 text-sm text-ink-soft">Nobody is owed anything right now.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-sm">
                <thead>
                  <tr className="border-y border-[#e3e9f1] bg-[#f7f9fc] text-left text-[11px] font-bold uppercase tracking-[0.06em] text-ink/50">
                    <th className="px-5 py-2.5">Who</th>
                    <th className="px-3 py-2.5">Bank account</th>
                    <th className="px-3 py-2.5 text-right">Amount</th>
                    <th className="px-5 py-2.5" />
                  </tr>
                </thead>
                <tbody>
                  {owed.map((o) => (
                    <tr key={o.key} className="border-b border-[#eef2f7] align-top">
                      <td className="px-5 py-3">
                        <p className="font-semibold text-ink">{o.name}</p>
                        <p className="text-xs text-ink-soft">{o.role}</p>
                      </td>
                      <td className="px-3 py-3 text-xs">
                        {o.account ? (
                          <>
                            <p className="font-semibold text-ink">{o.accountName}</p>
                            <p className="font-mono text-ink-soft">
                              {o.bank} · {o.account}
                            </p>
                          </>
                        ) : (
                          <span className="font-semibold text-verdict-red">No bank details yet</span>
                        )}
                      </td>
                      <td className="px-3 py-3 text-right font-display font-bold text-ink">{nairaFromKobo(o.amount)}</td>
                      <td className="px-5 py-3 text-right">
                        {o.account && <MarkPaid who={o.who} name={o.name} amount={nairaFromKobo(o.amount)} earningIds={o.ids} />}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </AdminCard>
      </div>

      {/* History: folded, so this week's work comes first. */}
      <div className="mt-6">
        <FoldCard
          title="Paid"
          sub="Every payout marked as paid, newest first"
          meta={`${team.payouts.length} ${team.payouts.length === 1 ? "payout" : "payouts"}`}
          bodyClassName=""
        >
          {team.payouts.length === 0 ? (
            <p className="px-6 pb-6 text-sm text-ink-soft">Nothing paid yet.</p>
          ) : (
            <ul className="divide-y divide-[#eef2f7]">
              {team.payouts.slice(0, 100).map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-3 px-5 py-3 text-sm sm:px-6">
                  <div>
                    <p className="font-semibold text-ink">{nameOf.get(p.hospital_id ?? p.agent_id ?? "") ?? "-"}</p>
                    <p className="text-xs text-ink-soft">
                      {new Date(p.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                      {p.status !== "paid" ? ` · ${p.status}` : ""}
                    </p>
                  </div>
                  <p className="font-display font-bold text-ink">{nairaFromKobo(p.amount)}</p>
                </li>
              ))}
            </ul>
          )}
        </FoldCard>
      </div>
    </AdminShell>
  );
}
