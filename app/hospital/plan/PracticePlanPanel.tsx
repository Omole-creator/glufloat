"use client";

import { CheckCircle2, CreditCard } from "lucide-react";
import QrCodeCard from "@/components/hospital/QrCodeCard";
import {
  nairaText,
  planName,
  PRACTICE_PAYSTACK_URLS,
  PRACTICE_PLANS,
  PRACTICE_TRIAL_DAYS,
} from "@/lib/hospitalPlans";
import type { HospitalRow } from "@/lib/hospitalServer";

export type PracticePayment = { reference: string; plan: string; amount: number; paid_at: string };

function niceDate(iso: string | null): string {
  if (!iso) return "-";
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
}

/**
 * The Plan page for a dietitian (GluFloat for dietitians, 2026-10-13). She
 * pays by Paystack, one month at a time, on one of three fixed-amount pages.
 * Paystack sends her back to /dietitians/paid, which links the payment to her
 * practice. Paying adds a month after whatever she has left, free days
 * included (lib/practicePayment.ts).
 */
export default function PracticePlanPanel({
  practice,
  used,
  live,
  notStarted,
  email,
  payments,
  justPaid,
}: {
  practice: HospitalRow;
  used: number;
  live: boolean;
  notStarted: boolean;
  email: string | null;
  payments: PracticePayment[];
  justPaid: boolean;
}) {
  const pct = practice.seats ? Math.min(100, Math.round((used / practice.seats) * 100)) : 0;
  const onPlan = practice.plan && practice.plan !== "pilot" ? practice.plan : null;
  const status = notStarted
    ? `Your ${PRACTICE_TRIAL_DAYS} free days start when your first patient joins`
    : live
      ? `Open until ${niceDate(practice.access_until)}`
      : `Ended ${niceDate(practice.access_until)}`;
  const payHref = (url: string) => (email ? `${url}?email=${encodeURIComponent(email)}` : url);

  return (
    <div className="mt-6 grid gap-6 lg:grid-cols-[1.2fr_1fr]">
      <div className="space-y-6">
        {justPaid && (
          <p className="flex items-start gap-2 rounded-2xl bg-leaf/10 px-4 py-3.5 text-sm font-semibold text-ink ring-1 ring-inset ring-leaf/25">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-leaf-deep" /> Thank you. Your payment is in, and your plan
            is open.
          </p>
        )}

        <section className="overflow-hidden rounded-2xl bg-gradient-to-br from-[#0b2e59] to-brand p-6 text-white">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-white/60">Your plan</p>
          <p className="mt-1 font-display text-3xl font-bold">
            {onPlan ? planName(onPlan) : `${PRACTICE_TRIAL_DAYS} free days`}
          </p>
          <p className="mt-1 text-sm text-white/75">{status}</p>
          <div className="mt-6">
            <div className="flex justify-between text-sm">
              <span className="text-white/75">Places used</span>
              <span className="font-bold">
                {used} of {practice.seats}
              </span>
            </div>
            <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-white/15">
              <div className="h-full rounded-full bg-leaf-bright" style={{ width: `${pct}%` }} />
            </div>
          </div>
          <p className="mt-5 text-sm text-white/80">
            Every patient gets everything in GluFloat Premium. You set your own price for your patients.
          </p>
        </section>

        <section className="rounded-2xl border border-[#e3e9f1] bg-white p-5 sm:p-6">
          <h2 className="font-display text-lg font-bold text-ink">{onPlan ? "Renew or change your plan" : "Choose a plan"}</h2>
          <p className="mt-1 text-sm text-ink-soft">
            Pay by card, bank transfer or USSD. Each payment adds one month. Any days you have left are kept.
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            {PRACTICE_PLANS.map((p) => {
              const mine = p.id === onPlan;
              return (
                <div
                  key={p.id}
                  className={`flex flex-col rounded-2xl p-4 ring-1 ring-inset ${mine ? "bg-brand/[0.06] ring-brand/30" : "bg-mist/50 ring-ink/[0.06]"}`}
                >
                  <p className="font-display text-base font-bold text-ink">{p.name}</p>
                  <p className="mt-1 font-display text-2xl font-bold text-ink">{nairaText(p.monthly)}</p>
                  <p className="text-xs text-ink-soft">a month · {nairaText(p.monthly / p.seats)} a patient</p>
                  {mine && <p className="mt-2 text-xs font-bold text-brand">Your plan now</p>}
                  <a
                    href={payHref(PRACTICE_PAYSTACK_URLS[p.id])}
                    className="mt-4 inline-flex items-center justify-center gap-1.5 rounded-full bg-leaf px-4 py-2.5 text-sm font-bold text-white hover:bg-leaf-deep"
                    aria-label={`Pay ${nairaText(p.monthly)} for ${p.name}`}
                  >
                    <CreditCard className="h-4 w-4" /> Pay {nairaText(p.monthly)}
                  </a>
                </div>
              );
            })}
          </div>
          <p className="mt-4 text-xs text-ink-soft">
            Need more than 20 patients? <a href="/hospitals" className="font-semibold text-brand hover:underline">See the hospital plans</a>.
          </p>
        </section>

        <section className="rounded-2xl border border-[#e3e9f1] bg-white p-5 sm:p-6">
          <h2 className="font-display text-lg font-bold text-ink">Your payments</h2>
          {payments.length === 0 ? (
            <p className="mt-2 text-sm text-ink-soft">Your payments to GluFloat will be here.</p>
          ) : (
            <ul className="mt-3 divide-y divide-[#eef2f7]">
              {payments.map((p) => (
                <li key={p.reference} className="flex items-center justify-between gap-3 py-3 text-sm">
                  <span>
                    <span className="block font-semibold text-ink">{planName(p.plan)}, 1 month</span>
                    <span className="text-xs text-ink-soft">{niceDate(p.paid_at)}</span>
                  </span>
                  <span className="font-bold text-ink">{nairaText(p.amount / 100)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <QrCodeCard name={practice.name} code={practice.code} open={live || notStarted} practice />
    </div>
  );
}
