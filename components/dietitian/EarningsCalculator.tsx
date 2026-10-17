"use client";

import { useState } from "react";
import Link from "next/link";
import { dietitianShareNaira, GLUFLOAT_SHARE, GLUFLOAT_SHARE_VOLUME, glufloatShareFor, naira, PATIENT_PRICE_MIN, VOLUME_PATIENTS } from "@/lib/patientPays";

/**
 * The /dietitians earnings calculator (2026-10-17, replaces the old 5/10/20
 * plan cards). She picks how many patients and her price; it shows what she
 * earns a month. Every number comes from lib/patientPays.ts, so the page can
 * never promise a split the payment code does not make.
 */
const PRICES = [4_500, 6_000, 8_000, 10_000];

export default function EarningsCalculator() {
  const [patients, setPatients] = useState(10);
  const [price, setPrice] = useState(6_000);
  const each = dietitianShareNaira(price, patients);
  const volume = patients > VOLUME_PATIENTS;
  const month = each * patients;

  return (
    <div className="mx-auto mt-10 grid max-w-5xl gap-5 lg:grid-cols-[1.1fr_1fr]">
      <div className="rounded-[28px] bg-[#F4F7FB] p-7 ring-1 ring-ink/[0.05]">
        <label htmlFor="calc-patients" className="font-display text-base font-bold text-ink">
          How many patients?
        </label>
        <div className="mt-3 flex items-center gap-4">
          <input
            id="calc-patients"
            type="range"
            min={1}
            max={100}
            value={patients}
            onChange={(e) => setPatients(Number(e.target.value))}
            className="h-2 flex-1 cursor-pointer accent-brand"
          />
          <span className="w-14 text-right font-display text-2xl font-bold text-ink">{patients}</span>
        </div>

        <p className="mt-7 font-display text-base font-bold text-ink" id="calc-price-label">
          Your price a month, per patient
        </p>
        <div role="radiogroup" aria-labelledby="calc-price-label" className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {PRICES.map((p) => (
            <button
              key={p}
              type="button"
              role="radio"
              aria-checked={price === p}
              onClick={() => setPrice(p)}
              className={`rounded-full px-3 py-2.5 text-sm font-bold transition-colors ${
                price === p ? "bg-brand text-white" : "bg-white text-ink ring-1 ring-inset ring-line hover:ring-brand/40"
              }`}
            >
              {naira(p)}
            </button>
          ))}
        </div>
        <p className="mt-3 text-sm text-ink-soft">
          You choose any price from {naira(PATIENT_PRICE_MIN)}. These are only examples.
        </p>
        <p
          className={`mt-3 rounded-xl px-3.5 py-2.5 text-sm ${
            volume ? "bg-leaf/10 font-semibold text-leaf-deep ring-1 ring-inset ring-leaf/20" : "bg-white text-ink ring-1 ring-inset ring-line"
          }`}
        >
          Over {VOLUME_PATIENTS} paying patients, GluFloat keeps {naira(GLUFLOAT_SHARE_VOLUME)} instead of {naira(GLUFLOAT_SHARE)}. You keep{" "}
          {naira(GLUFLOAT_SHARE - GLUFLOAT_SHARE_VOLUME)} more on every patient.
        </p>
      </div>

      <div className="relative flex flex-col justify-between rounded-[28px] bg-gradient-to-br from-[#0B2E5C] to-brand p-7 text-white">
        <div>
          <p className="text-sm font-semibold text-white/75">You earn each month</p>
          <p className="mt-2 font-display text-5xl font-bold" aria-live="polite">
            {naira(month)}
          </p>
          <dl className="mt-6 space-y-2 text-sm">
            <div className="flex justify-between gap-3 border-b border-white/15 pb-2">
              <dt className="text-white/75">Each patient pays you</dt>
              <dd className="font-semibold">{naira(price)}</dd>
            </div>
            <div className="flex justify-between gap-3 border-b border-white/15 pb-2">
              <dt className="text-white/75">GluFloat keeps</dt>
              <dd className="font-semibold">{naira(glufloatShareFor(patients))}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-white/75">You keep, per patient</dt>
              <dd className="font-semibold text-leaf-bright">{naira(each)}</dd>
            </div>
          </dl>
        </div>
        <Link
          href="/dietitians/start"
          className="mt-7 inline-flex h-12 items-center justify-center rounded-full bg-leaf px-6 text-sm font-bold text-white hover:bg-leaf-deep"
        >
          Start free
        </Link>
      </div>
    </div>
  );
}
