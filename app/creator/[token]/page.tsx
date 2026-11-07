import type { Metadata } from "next";
import Image from "next/image";
import { createAdminClient } from "@/lib/supabase/server";
import { creatorsReady, type Creator } from "@/lib/creatorsServer";
import { loadCreators } from "@/lib/creatorTeam";
import { CREATOR_HIGH_AFTER, CREATOR_HOLD_DAYS, CREATOR_PAY_DAY, creatorLink, creatorRate, nextPayDay, talkingPoints } from "@/lib/creators";
import { maskAccount, nairaFromKobo } from "@/lib/careFees";
import { SITE_URL } from "@/lib/site";
import CreatorShare from "./CreatorShare";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "My Glufloat earnings", robots: { index: false, follow: false } };

/**
 * A creator partner's own page (founder's terms, 2026-10-22). No login: the
 * secret link is the key, made in /admin/creator-partners, where a new one can
 * replace it. Counts and money only, never anybody's name or health, and it
 * can never change where the money goes (only Glufloat admin can).
 */
export default async function CreatorDashboard({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const admin = createAdminClient();
  const ready = await creatorsReady(admin);
  const { data: me } = ready ? await admin.from("creators").select("*").eq("dash_token", token).maybeSingle() : { data: null };
  if (!me || (me as Creator).status !== "active")
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f2f5f9] px-4">
        <p className="max-w-sm rounded-2xl bg-white p-6 text-center text-sm text-ink-soft shadow-sm">
          This link does not work. Please ask Glufloat for your page link.
        </p>
      </main>
    );
  const creator = me as Creator;
  const [stats] = await loadCreators(admin, creator.id);
  const link = creatorLink(SITE_URL, creator.code);
  const rate = creatorRate(stats.paid);
  const first = creator.name.split(/\s+/)[0];
  const day = (iso: string | Date) => new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  const toHigh = Math.max(0, CREATOR_HIGH_AFTER - stats.paid);

  const tiles = [
    { label: "Ready to pay you", value: nairaFromKobo(stats.payable), sub: `sent by ${day(nextPayDay())}` },
    { label: "Waiting", value: nairaFromKobo(stats.waiting), sub: `earned in the last ${CREATOR_HOLD_DAYS} days` },
    { label: "Paid to you", value: nairaFromKobo(stats.paidOut), sub: "all time" },
  ];
  const counts = [
    { label: "Signed up with your code", value: String(stats.joined) },
    { label: "Have paid", value: String(stats.paid) },
    { label: "Your share now", value: `${Math.round(rate * 100)}%` },
  ];

  return (
    <main className="min-h-screen bg-[#f2f5f9] pb-16">
      <header className="bg-gradient-to-br from-[#0d3568] via-[#14538f] to-[#1b5faa] px-4 pb-8 pt-6 text-white sm:px-6">
        <div className="mx-auto max-w-4xl">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white">
              <Image src="/logo-mark.png" alt="" width={24} height={24} className="h-6 w-6" />
            </span>
            <span className="font-display text-lg font-bold">Glufloat</span>
          </div>
          <h1 className="mt-6 font-display text-2xl font-bold sm:text-3xl">Hello, {first}</h1>
          <p className="mt-1 text-sm text-white/80">
            Your code is <span className="font-bold text-white">{creator.code}</span> · your people and your money
          </p>
          <div className="mt-5">
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.1em] text-white/70">Your link</p>
            <CreatorShare link={link} points={talkingPoints(creator.code, link)} />
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

        <div className="mt-3 grid grid-cols-3 gap-3">
          {counts.map((c) => (
            <div key={c.label} className="rounded-2xl border border-[#e3e9f1] bg-white p-4 text-center">
              <p className="font-display text-2xl font-bold text-ink">{c.value}</p>
              <p className="mt-1 text-xs text-ink-soft">{c.label}</p>
            </div>
          ))}
        </div>
        <p className="mt-3 text-sm text-ink-soft">
          {toHigh > 0
            ? `When ${toHigh} more of your people pay, your share goes up to 50% on new payments.`
            : "Your share is 50% on new payments."}
        </p>

        <section className="mt-6 rounded-2xl border border-[#e3e9f1] bg-white p-5 text-sm leading-relaxed text-ink-soft sm:p-6">
          <h2 className="font-display text-base font-bold text-ink">How you are paid</h2>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>Your people get a free week, then 20% off their first 3 months.</li>
            <li>
              You get {Math.round(rate * 100)}% of what Glufloat receives after the payment fee, for 12 months from each person&apos;s first
              payment.
            </li>
            <li>
              We pay you by bank transfer by the {CREATOR_PAY_DAY}th of each month, for money earned at least {CREATOR_HOLD_DAYS} days before.
            </li>
          </ul>
          <p className="mt-3">
            Paid to:{" "}
            <span className="font-semibold text-ink">
              {creator.account_number
                ? `${creator.bank_name} ${maskAccount(creator.account_number)}, ${creator.account_name}`
                : "No bank yet. Please send Glufloat your bank details."}
            </span>
          </p>
        </section>

        <section className="mt-6 overflow-hidden rounded-2xl border border-[#e3e9f1] bg-white">
          <h2 className="border-b border-[#eef2f7] px-5 py-4 font-display text-base font-bold text-ink">Your earnings</h2>
          {stats.earnings.length === 0 ? (
            <p className="px-5 py-6 text-center text-sm text-ink-soft">Nothing yet. You earn when somebody who used your code pays.</p>
          ) : (
            <ul className="divide-y divide-[#eef2f7]">
              {stats.earnings.map((e) => (
                <li key={e.id} className="flex items-center justify-between gap-3 px-5 py-3 text-sm">
                  <div>
                    <p className="font-semibold text-ink">{day(e.earned_at)}</p>
                    <p className="text-xs text-ink-soft">A payment of {nairaFromKobo(Number(e.payment_amount))}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-display text-base font-bold text-ink">{nairaFromKobo(e.amount)}</p>
                    <p className="text-xs text-ink-soft">{e.payout_id ? "Paid to you" : "To be paid"}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="mt-6 overflow-hidden rounded-2xl border border-[#e3e9f1] bg-white">
          <h2 className="border-b border-[#eef2f7] px-5 py-4 font-display text-base font-bold text-ink">Your people</h2>
          {stats.people.length === 0 ? (
            <p className="px-5 py-6 text-center text-sm text-ink-soft">Nobody yet. Share your link or your code.</p>
          ) : (
            <ul className="divide-y divide-[#eef2f7]">
              {stats.people.map((p, i) => (
                <li key={i} className="flex items-center justify-between gap-3 px-5 py-3 text-sm">
                  <div>
                    <p className="font-semibold text-ink">Person {i + 1}</p>
                    <p className="text-xs text-ink-soft">
                      Joined {day(p.joinedAt)} · {p.via === "code" ? "typed your code" : "used your link"}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-ink">{p.paid ? "Paying" : "Not paid yet"}</p>
                    <p className="text-xs text-ink-soft">{nairaFromKobo(p.earned)} earned</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}
