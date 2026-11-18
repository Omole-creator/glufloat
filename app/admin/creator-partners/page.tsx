import { BadgePercent } from "lucide-react";
import { isAdmin } from "@/lib/adminSession";
import { createAdminClient } from "@/lib/supabase/server";
import AdminLogin from "../AdminLogin";
import AdminShell from "../AdminShell";
import AdminHero from "../AdminHero";
import BankDetailsForm from "@/components/BankDetailsForm";
import FoldCard from "@/components/FoldCard";
import { creatorsReady } from "@/lib/creatorsServer";
import { loadCreators } from "@/lib/creatorTeam";
import { CREATOR_HOLD_DAYS, CREATOR_PAY_DAY, creatorLink, creatorRate, partnerTitle, talkingPoints } from "@/lib/creators";
import { nairaFromKobo } from "@/lib/careFees";
import { listBanks } from "@/lib/paystackBanks";
import { SITE_URL } from "@/lib/site";
import { AddCreatorForm, CreatorLinks, CreatorPayButton } from "./CreatorControls";

export const dynamic = "force-dynamic";

/**
 * Creator partners (founder's terms, 2026-10-22). Different from "Creators",
 * which is the outreach email list: these are the ones who said yes. Each
 * gets a code, a link (glufloat.com/<code>) and a private page. Paid monthly
 * by the 10th, on earnings at least 14 days old.
 */
export default async function CreatorPartnersPage() {
  if (!(await isAdmin())) return <AdminLogin />;
  const admin = createAdminClient();
  const icon = <BadgePercent className="h-5 w-5" />;
  if (!(await creatorsReady(admin)))
    return (
      <AdminShell title="Creator partners" icon={icon}>
        <div className="mt-6 rounded-2xl border border-[#e3e9f1] bg-white p-6 text-sm text-ink-soft">
          Waiting for the database update. Paste <code className="font-mono text-ink">supabase/creator-partners-schema.sql</code> into the
          Supabase SQL editor (#41 in SETUP.md).
        </div>
      </AdminShell>
    );

  const [list, banks] = await Promise.all([loadCreators(admin), listBanks()]);
  const sum = (f: (s: (typeof list)[number]) => number) => list.reduce((n, s) => n + f(s), 0);

  return (
    <AdminShell title="Creator partners" subtitle="Creators who said yes, and pharmacies: their codes, people and money" icon={icon}>
      <div className="mt-6">
        <AdminHero
          items={[
            {
              label: "Partners",
              value: String(list.filter((s) => s.creator.status === "active").length),
              sub: `switched on: ${list.filter((s) => s.creator.status === "active" && s.creator.kind !== "pharmacy").length} creators, ${list.filter((s) => s.creator.status === "active" && s.creator.kind === "pharmacy").length} pharmacies`,
            },
            { label: "People from codes", value: String(sum((s) => s.joined)), sub: `${sum((s) => s.paid)} have paid` },
            { label: "To pay now", value: nairaFromKobo(sum((s) => s.payable)), sub: `by the ${CREATOR_PAY_DAY}th, ${CREATOR_HOLD_DAYS}+ days old` },
            { label: "Paid to creators", value: nairaFromKobo(sum((s) => s.paidOut)), sub: "all time" },
          ]}
        />
      </div>

      <FoldCard
        className="mt-6"
        title="Add a creator or pharmacy"
        sub="A creator's code is their first name. A pharmacy's is its name and area. You can type your own."
        open={list.length === 0}
      >
        <AddCreatorForm />
      </FoldCard>

      <div className="mt-6 space-y-3">
        {list.length === 0 && (
          <p className="rounded-2xl border border-[#e3e9f1] bg-white p-6 text-sm text-ink-soft">Nobody yet. Add your first creator above.</p>
        )}
        {list.map((s) => {
          const c = s.creator;
          const off = c.status === "off";
          const link = creatorLink(SITE_URL, c.code);
          const pharmacy = c.kind === "pharmacy";
          return (
            <FoldCard
              key={c.id}
              className={off ? "opacity-70" : ""}
              title={`${pharmacy ? "Pharmacy: " : ""}${partnerTitle(c)} · ${c.code}`}
              sub={`${link}${pharmacy && c.contact_name ? ` · ${c.contact_name}` : ""}${c.phone ? ` · ${c.phone}` : ""}${off ? " · Switched off" : ""}`}
              meta={
                <>
                  <span className="block font-semibold text-ink">
                    {s.joined} {s.joined === 1 ? "person" : "people"} · {s.paid} paid
                  </span>
                  <span className="block">{nairaFromKobo(s.payable)} to pay now</span>
                </>
              }
            >
              {pharmacy && c.address && <p className="mb-3 text-sm text-ink-soft">{c.address}</p>}
              <div className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-3 lg:grid-cols-6">
                {[
                  ["Opened the link", String(s.visits)],
                  ["Signed up", String(s.joined)],
                  ["Have paid", String(s.paid)],
                  ["Share now", `${Math.round(creatorRate(s.paid) * 100)}%`],
                  ["To pay now", nairaFromKobo(s.payable)],
                  ["Waiting / paid", `${nairaFromKobo(s.waiting)} / ${nairaFromKobo(s.paidOut)}`],
                ].map(([label, value]) => (
                  <div key={label}>
                    <p className="text-[11px] font-bold uppercase tracking-[0.06em] text-ink/50">{label}</p>
                    <p className="font-display text-xl font-bold text-ink">{value}</p>
                  </div>
                ))}
              </div>
              <div className="mt-4">
                <CreatorPayButton creatorId={c.id} name={c.name} ids={s.payableIds} amount={nairaFromKobo(s.payable)} />
              </div>
              <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_340px]">
                <CreatorLinks
                  id={c.id}
                  name={c.name}
                  phone={c.phone}
                  email={c.email}
                  code={c.code}
                  link={link}
                  dashLink={`${SITE_URL}/creator/${c.dash_token}`}
                  points={talkingPoints(c.code, link)}
                  off={off}
                  kind={pharmacy ? "pharmacy" : "creator"}
                  branch={c.branch ?? null}
                  address={c.address ?? null}
                  contactName={c.contact_name ?? null}
                />
                <BankDetailsForm
                  banks={banks}
                  endpoint="/api/admin/creator-partners/bank"
                  extra={{ creatorId: c.id }}
                  title="Their bank"
                  saved={{ bankName: c.bank_name, accountShown: c.account_number, accountName: c.account_name }}
                />
              </div>
              {s.earnings.length > 0 && (
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="text-ink/50">
                      <tr>
                        <th className="py-1.5 pr-3 font-bold">Date</th>
                        <th className="py-1.5 pr-3 font-bold">They paid</th>
                        <th className="py-1.5 pr-3 font-bold">Paystack fee</th>
                        <th className="py-1.5 pr-3 font-bold">Rate</th>
                        <th className="py-1.5 pr-3 font-bold">Creator share</th>
                        <th className="py-1.5 font-bold">Status</th>
                      </tr>
                    </thead>
                    <tbody className="text-ink">
                      {s.earnings.map((e) => (
                        <tr key={e.id} className="border-t border-[#eef2f7]">
                          <td className="py-1.5 pr-3">{new Date(e.earned_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</td>
                          <td className="py-1.5 pr-3">{nairaFromKobo(Number(e.payment_amount))}</td>
                          <td className="py-1.5 pr-3">{nairaFromKobo(Number(e.paystack_fee))}</td>
                          <td className="py-1.5 pr-3">{Math.round(Number(e.rate) * 100)}%</td>
                          <td className="py-1.5 pr-3 font-semibold">{nairaFromKobo(e.amount)}</td>
                          <td className="py-1.5">{e.payout_id ? "Paid" : s.payableIds.includes(e.id) ? "To pay now" : "Waiting"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </FoldCard>
          );
        })}
      </div>
    </AdminShell>
  );
}
