"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import {
  ANNUAL_MONTHS_PAID,
  CUSTOM_PLAN_NAME,
  HOSPITAL_PLANS,
  PREMIUM_MONTHLY,
  annualPrice,
  annualSaving,
  nairaText,
  perPatientDay,
  perPatientMonth,
  premiumValue,
} from "@/lib/hospitalPlans";

/**
 * The hospital plan cards (founder, 2026-10-12): Care 50 / 100 / 200 and a
 * custom plan, monthly or yearly (12 months for the price of 10).
 *
 * How the price is made to read as a steal, all of it true:
 *  - the cost per patient per DAY, which is small;
 *  - what the same patients would pay for Premium on their own, struck out;
 *  - on yearly, the naira saved.
 */
export default function HospitalPricing() {
  const [yearly, setYearly] = useState(false);
  const billing = yearly ? "annual" : "monthly";

  const included = [
    "Everything in GluFloat Premium for each patient",
    "Dashboard for all your doctors and dietitians",
    "Patients chat with your own team on WhatsApp",
    "Your own QR poster for the waiting room",
  ];

  return (
    <div className="mx-auto mt-10 max-w-6xl">
      <div
        role="radiogroup"
        aria-label="How often you pay"
        className="mx-auto flex w-full max-w-sm items-center gap-1 rounded-full bg-[#F4F7FB] p-1 ring-1 ring-line"
      >
        {[
          { v: false, label: "Monthly" },
          { v: true, label: "Yearly" },
        ].map((o) => (
          <button
            key={o.label}
            type="button"
            role="radio"
            aria-checked={yearly === o.v}
            onClick={() => setYearly(o.v)}
            className={`flex flex-1 items-center justify-center gap-2 rounded-full px-4 py-2.5 text-sm font-bold transition-all ${
              yearly === o.v ? "bg-brand text-white shadow-[0_8px_20px_-8px_rgba(27,95,170,0.6)]" : "text-ink-soft hover:text-ink"
            }`}
          >
            {o.label}
            {o.v && (
              <span className={`rounded-full px-2 py-0.5 text-[11px] ${yearly ? "bg-white/20 text-white" : "bg-leaf/15 text-leaf-deep"}`}>
                2 months free
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
        {HOSPITAL_PLANS.map((p) => {
          const pick = p.id === "care100";
          const price = yearly ? annualPrice(p) : p.monthly;
          return (
            <div
              key={p.id}
              className={`relative flex flex-col rounded-[28px] p-6 ${
                pick
                  ? "bg-gradient-to-br from-[#0B2E5C] to-[#1B5FAA] text-white shadow-[0_30px_70px_-30px_rgba(27,95,170,0.8)]"
                  : "bg-[#F4F7FB] text-ink ring-1 ring-ink/[0.05]"
              }`}
            >
              {pick && (
                <span className="absolute -top-3 left-6 rounded-full bg-leaf px-3 py-1 text-xs font-bold text-white">Recommended</span>
              )}
              <p className="font-display text-xl font-bold">{p.name}</p>
              <p className={`text-sm ${pick ? "text-white/70" : "text-ink-soft"}`}>Up to {p.seats} patients</p>

              <p className="mt-5 font-display text-4xl font-bold tracking-tight">{nairaText(price)}</p>
              <p className={`text-sm ${pick ? "text-white/70" : "text-ink-soft"}`}>{yearly ? "a year" : "a month"}</p>

              <div className={`mt-4 rounded-2xl px-3.5 py-3 ${pick ? "bg-white/10" : "bg-white"}`}>
                <p className="font-display text-lg font-bold">
                  {nairaText(perPatientDay(p, billing))} <span className="text-sm font-semibold">a patient a day</span>
                </p>
                <p className={`text-xs ${pick ? "text-white/70" : "text-ink-soft"}`}>
                  {nairaText(perPatientMonth(p, billing))} a patient a month
                </p>
              </div>

              <p className={`mt-3 text-sm ${pick ? "text-white/80" : "text-ink-soft"}`}>
                Worth <span className="line-through">{nairaText(premiumValue(p) * (yearly ? 12 : 1))}</span> if each patient paid
                for Premium
              </p>
              {yearly && (
                <p className={`mt-1 text-sm font-bold ${pick ? "text-leaf-bright" : "text-leaf-deep"}`}>
                  You save {nairaText(annualSaving(p))}
                </p>
              )}

              <a
                href="#pilot"
                className={`mt-6 inline-flex h-12 items-center justify-center rounded-full text-sm font-bold transition-colors ${
                  pick ? "bg-leaf text-white hover:bg-leaf-deep" : "bg-brand text-white hover:bg-brand-deep"
                }`}
              >
                Start with a free pilot
              </a>
            </div>
          );
        })}

        <div className="flex flex-col rounded-[28px] bg-white p-6 text-ink ring-2 ring-dashed ring-brand/25">
          <p className="font-display text-xl font-bold">{CUSTOM_PLAN_NAME}</p>
          <p className="text-sm text-ink-soft">More than 200 patients, or several branches</p>
          <p className="mt-5 font-display text-3xl font-bold tracking-tight">Ask us</p>
          <p className="text-sm text-ink-soft">a quote made for you</p>
          <p className="mt-4 text-sm leading-relaxed text-ink-soft">
            Tell us how many patients you have, and we send a quote with a lower price for each patient.
          </p>
          <a
            href="#pilot"
            className="mt-auto inline-flex h-12 items-center justify-center rounded-full border-2 border-brand text-sm font-bold text-brand transition-colors hover:bg-brand/5"
          >
            Ask for a quote
          </a>
        </div>
      </div>

      <div className="mx-auto mt-10 max-w-4xl rounded-[28px] bg-[#F4F7FB] p-6 ring-1 ring-ink/[0.04] sm:p-7">
        <p className="text-center font-display text-lg font-bold text-ink">Every plan includes</p>
        <ul className="mt-4 grid gap-3 sm:grid-cols-2">
          {included.map((t) => (
            <li key={t} className="flex items-center gap-2.5 text-ink">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-leaf text-white">
                <Check className="h-3.5 w-3.5" strokeWidth={3} />
              </span>
              {t}
            </li>
          ))}
        </ul>
        <p className="mt-5 text-center text-sm text-ink-soft">
          Premium alone is {nairaText(PREMIUM_MONTHLY)} a month for one person. Yearly plans give you 12 months for the price of{" "}
          {ANNUAL_MONTHS_PAID}. Prices have no VAT added.
        </p>
      </div>
    </div>
  );
}
