"use client";

import { useState } from "react";
import Link from "next/link";
import { nairaText, PRACTICE_PLANS, PRACTICE_TRIAL_DAYS, practiceYearly } from "@/lib/hospitalPlans";

/**
 * The dietitian plan cards on /dietitians (founder, 2026-10-13): 5 / 10 / 20
 * Patients, monthly or yearly (12 months for the price of 10, like
 * hospitals), with 10 Patients marked Recommended. Every button starts the
 * free days; she picks and pays on her own Plan page once patients join.
 */
export default function PracticePricing() {
  const [yearly, setYearly] = useState(false);
  return (
    <div className="mx-auto mt-10 max-w-5xl">
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

      <div className="mt-10 grid gap-5 md:grid-cols-3">
        {PRACTICE_PLANS.map((p, i) => {
          const pick = i === 1;
          const price = yearly ? practiceYearly(p) : p.monthly;
          return (
            <div
              key={p.id}
              className={`relative flex flex-col rounded-[28px] p-7 ring-1 ${
                pick ? "bg-gradient-to-br from-[#0B2E5C] to-brand text-white ring-white/20" : "bg-[#F4F7FB] text-ink ring-ink/[0.05]"
              }`}
            >
              {pick && (
                <span className="absolute -top-3 left-7 rounded-full bg-leaf px-3 py-1 text-xs font-bold text-white">Recommended</span>
              )}
              <p className="font-display text-xl font-bold">{p.name}</p>
              <p className="mt-4 font-display text-4xl font-bold">{nairaText(price)}</p>
              <p className={`mt-1 text-sm ${pick ? "text-white/75" : "text-ink-soft"}`}>{yearly ? "a year" : "a month"}</p>
              <p className={`mt-4 text-sm ${pick ? "text-white/85" : "text-ink-soft"}`}>
                {nairaText(price / (yearly ? 12 : 1) / p.seats)} a patient each month. Each patient gets GluFloat Premium.
              </p>
              {yearly && (
                <p className={`mt-2 text-sm font-semibold ${pick ? "text-leaf-bright" : "text-leaf-deep"}`}>
                  You save {nairaText(p.monthly * 12 - practiceYearly(p))}
                </p>
              )}
              <Link
                href="/dietitians/start"
                className={`mt-6 inline-flex h-12 items-center justify-center rounded-full px-5 text-sm font-bold ${
                  pick ? "bg-leaf text-white hover:bg-leaf-deep" : "bg-brand text-white hover:bg-brand-deep"
                }`}
              >
                Start {PRACTICE_TRIAL_DAYS} free days
              </Link>
            </div>
          );
        })}
      </div>
    </div>
  );
}
