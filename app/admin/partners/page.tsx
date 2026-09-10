import { cookies } from "next/headers";
import Link from "next/link";
import { Handshake, Clock, CheckCircle2 } from "lucide-react";
import { ADMIN_COOKIE, adminToken } from "@/lib/adminAuth";
import AdminLogin from "../AdminLogin";
import AdminShell from "../AdminShell";
import AdminHero from "../AdminHero";
import AdminTile from "../AdminTile";
import PartnerPanel from "./PartnerPanel";
import ReferredUsers from "./ReferredUsers";
import PeriodPicker from "@/components/PeriodPicker";
import PartnerReportButton from "./PartnerReportButton";
import { naira } from "@/lib/partners";
import { getPartnerStats } from "@/lib/partnerStats";
import { parsePeriod, type PeriodParams } from "@/lib/period";

export const dynamic = "force-dynamic";

export default async function PartnersPage({
  searchParams,
}: {
  searchParams: Promise<PeriodParams & { partner?: string }>;
}) {
  const c = await cookies();
  const authed =
    !!process.env.ADMIN_PASSWORD && c.get(ADMIN_COOKIE)?.value === adminToken();
  if (!authed) return <AdminLogin />;

  const sp = await searchParams;
  const period = parsePeriod(sp);

  const { rows, totals } = await getPartnerStats(period);
  const open = sp.partner ? rows.find((r) => r.partner.id === sp.partner) : undefined;

  /** A link to this page, keeping the period you are looking at. */
  const q = (extra: Record<string, string>) => {
    const p = new URLSearchParams({
      grain: period.grain,
      y: String(period.y),
      m: String(period.m),
      q: String(period.q),
      d: period.d,
      ...extra,
    });
    return `/admin/partners?${p}`;
  };

  return (
    <AdminShell title="Partners" icon={<Handshake className="h-5 w-5" strokeWidth={2.2} />}>
      <>
        <PeriodPicker period={period} basePath="/admin/partners" keep={["partner"]} />

        <div className="mt-6">
          <AdminHero
            items={[
              { label: "People reached", value: totals.clicks.toLocaleString(), sub: `${period.label}, counted once each` },
              { label: "Free trials", value: totals.trials.toLocaleString(), sub: `${totals.signups} signed up` },
              { label: "Active subs", value: totals.activeSubs.toLocaleString(), sub: "paying right now" },
              { label: "Total earnings", value: naira(totals.earned), sub: period.label },
            ]}
          />
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <AdminTile
            icon={Clock}
            tone={totals.pending > 0 ? "amber" : "blue"}
            label="Pending payout"
            value={totals.pending > 0 ? naira(totals.pending) : "Nothing"}
            sub="you owe this now"
          />
          <AdminTile icon={CheckCircle2} tone="green" label="Paid out" value={naira(totals.paidOut)} sub="all time" />
        </div>

        {/* add a partner + the list */}
        <PartnerPanel
          rows={rows.map((r) => ({
            id: r.partner.id,
            seq: r.partner.seq,
            code: r.partner.code,
            name: r.partner.name,
            profession: r.partner.profession,
            email: r.partner.email,
            phone: r.partner.phone,
            active: r.partner.active,
            clicks: r.clicks,
            signups: r.signups,
            trials: r.trials,
            activeSubs: r.activeSubs,
            earned: r.earned,
            pending: r.pending,
            paidOut: r.paidOut,
          }))}
          openId={sp.partner ?? null}
          query={{
            grain: period.grain,
            y: String(period.y),
            m: String(period.m),
            q: String(period.q),
            d: period.d,
          }}
        />

        {/* one partner, opened */}
        {open && (
          <section className="mt-8 rounded-2xl bg-white p-6 shadow-[0_6px_28px_-14px_rgba(12,42,71,0.18)] ring-1 ring-ink/[0.05]">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-display text-xl font-bold text-ink">
                  {open.partner.name}{" "}
                  <span className="font-normal text-ink-soft">
                    ({open.partner.profession})
                  </span>
                </h2>
                <p className="mt-1 text-sm text-ink-soft">{open.partner.email}</p>
              </div>
              <div className="flex items-center gap-4">
                <PartnerReportButton
                  partnerId={open.partner.id}
                  partnerName={open.partner.name}
                  partnerEmail={open.partner.email}
                  query={{
                    grain: period.grain,
                    y: String(period.y),
                    m: String(period.m),
                    q: String(period.q),
                    d: period.d,
                  }}
                />
                <Link href={q({})} className="text-sm text-ink-soft underline hover:text-brand">
                  Close
                </Link>
              </div>
            </div>

            <div className="mt-5 grid gap-4 sm:grid-cols-3">
              <AdminTile label="Owed now" value={naira(open.pending)} />
              <AdminTile label="Paid so far" value={naira(open.paidOut)} />
              <AdminTile label="People still paying" value={String(open.activeSubs)} />
            </div>

            {/* the people they brought, and the payouts */}
            <ReferredUsers partnerId={open.partner.id} />
          </section>
        )}
      </>
    </AdminShell>
  );
}
