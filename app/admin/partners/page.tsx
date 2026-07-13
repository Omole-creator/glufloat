import { cookies } from "next/headers";
import Link from "next/link";
import { ADMIN_COOKIE, adminToken } from "@/lib/adminAuth";
import AdminLogin from "../AdminLogin";
import AdminShell from "../AdminShell";
import PartnerPanel from "./PartnerPanel";
import ReferredUsers from "./ReferredUsers";
import PeriodPicker from "@/components/PeriodPicker";
import PartnerReportButton from "./PartnerReportButton";
import { COMMISSION_CAP, COMMISSION_RATE, naira } from "@/lib/partners";
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

  const Tile = ({ label, value, sub }: { label: string; value: string; sub?: string }) => (
    <div className="rounded-2xl border border-line bg-white p-5">
      <p className="text-xs font-bold uppercase tracking-wider text-ink/50">{label}</p>
      <p className="mt-1 font-display text-3xl font-bold text-ink">{value}</p>
      {sub && <p className="mt-1 text-xs text-ink-soft">{sub}</p>}
    </div>
  );

  return (
    <AdminShell
      title="Partners"
      intro={`Dietitians, nurses, pharmacists and doctors who send you people. They earn ${Math.round(
        COMMISSION_RATE * 100,
      )}% of every payment, for up to ${COMMISSION_CAP} payments per person they bring.`}
    >
      <>
        <PeriodPicker period={period} basePath="/admin/partners" keep={["partner"]} />

        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <Tile
            label="People reached"
            value={totals.clicks.toLocaleString()}
            sub={`${period.label}, counted once each`}
          />
          <Tile label="Free trials" value={totals.trials.toLocaleString()} sub={`${totals.signups} signed up`} />
          <Tile label="Active subs" value={totals.activeSubs.toLocaleString()} sub="paying right now" />
          <Tile label="Total earnings" value={naira(totals.earned)} sub={period.label} />
          <Tile
            label="Pending payout"
            value={totals.pending > 0 ? naira(totals.pending) : "Nothing"}
            sub="you owe this now"
          />
          <Tile label="Paid out" value={naira(totals.paidOut)} sub="all time" />
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
          <section className="mt-8 rounded-2xl border border-line bg-white p-6">
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
                {/*
                  The report they can be sent, for whatever period is on screen.
                  It is aggregate only: no name, email or date of anybody they
                  referred ever appears in it.
                */}
                <PartnerReportButton
                  partnerId={open.partner.id}
                  partnerName={open.partner.name}
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
              <Tile label="Owed now" value={naira(open.pending)} />
              <Tile label="Paid so far" value={naira(open.paidOut)} />
              <Tile label="People still paying" value={String(open.activeSubs)} />
            </div>

            <p className="mt-4 rounded-xl bg-mist px-4 py-3 text-sm text-ink-soft">
              The report you send them shows counts and money only. The names and
              emails below are for you, and never leave Glufloat.
            </p>

            {/* the people they brought, and the payouts */}
            <ReferredUsers partnerId={open.partner.id} />
          </section>
        )}

        {rows.length > 0 && (
          <p className="mt-6 text-xs text-ink-soft">
            Everyone a partner brings in is a normal Glufloat account and still
            counts in the total users on the main dashboard. Nothing is
            double-counted, and nothing is hidden from it.
          </p>
        )}
      </>
    </AdminShell>
  );
}
