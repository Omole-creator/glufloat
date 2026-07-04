"use client";

import { useEffect, useState } from "react";
import {
  NESTUGE_URL,
  getTrialState,
  startTrial,
  type TrialState,
} from "@/lib/access";

export default function Paywall({ context }: { context: "search" | "meal" }) {
  const [trial, setTrial] = useState<TrialState>({ status: "none" });

  useEffect(() => {
    setTrial(getTrialState());
  }, []);

  const expired = trial.status === "expired";

  const begin = () => {
    startTrial();
    window.location.reload();
  };

  return (
    <div className="verdict-pop overflow-hidden rounded-2xl border-2 border-brand/25 bg-white text-left shadow-[0_16px_40px_-18px_rgba(12,45,77,0.4)]">
      <div className="bg-gradient-to-r from-brand to-leaf px-6 py-4">
        <p className="text-sm font-bold text-white">
          {expired
            ? "Your free week is done."
            : context === "search"
              ? "You have used your 3 free checks."
              : "The Meal Builder is a member feature."}
        </p>
      </div>

      <div className="p-6">
        <h3 className="font-display text-xl font-bold text-ink">
          {expired
            ? "Keep every answer for less than N50 a day."
            : "Unlock everything free for 7 days. No card needed."}
        </h3>
        <ul className="mt-4 space-y-2 text-sm text-ink-soft">
          <li className="flex gap-2">
            <span className="text-leaf">✓</span> Unlimited checks on all 250+
            Nigerian foods, growing monthly
          </li>
          <li className="flex gap-2">
            <span className="text-leaf">✓</span> Build a full meal and get the
            fix that turns it green
          </li>
          <li className="flex gap-2">
            <span className="text-leaf">✓</span> Portion, pairing, and how-often
            guidance on every single food
          </li>
          <li className="flex gap-2">
            <span className="text-leaf">✓</span>{" "}
            {expired
              ? "N1,500 a month. Cancel any time"
              : "7 days free on this device, then N1,500 a month if you stay"}
          </li>
        </ul>

        {expired ? (
          <a
            href={NESTUGE_URL}
            className="mt-6 block rounded-full bg-brand px-6 py-3.5 text-center text-sm font-bold text-white shadow-[0_10px_24px_-10px_rgba(27,95,170,0.8)] transition-all hover:-translate-y-0.5 hover:bg-brand-deep"
          >
            Subscribe for N1,500 / month
          </a>
        ) : (
          <button
            onClick={begin}
            className="mt-6 block w-full rounded-full bg-brand px-6 py-3.5 text-center text-sm font-bold text-white shadow-[0_10px_24px_-10px_rgba(27,95,170,0.8)] transition-all hover:-translate-y-0.5 hover:bg-brand-deep"
          >
            Start my 7-day free trial
          </button>
        )}

        <p className="mt-3 text-center text-xs text-ink-soft">
          {expired
            ? "Secure checkout via Nestuge. Your access code arrives right after payment."
            : "Nothing to pay today. When your week ends, membership is N1,500 a month via Nestuge."}
        </p>
        <p className="mt-4 text-center text-xs text-ink-soft">
          Already a member?{" "}
          <a href="/unlock" className="font-semibold text-brand hover:underline">
            Enter your access code
          </a>
        </p>
      </div>
    </div>
  );
}
