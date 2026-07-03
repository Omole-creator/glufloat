"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import {
  NESTUGE_URL,
  getTrialState,
  hasAccess,
  startTrial,
  type TrialState,
} from "@/lib/access";
import { events } from "@/lib/analytics";

export default function TrialPage() {
  const router = useRouter();
  const [state, setState] = useState<TrialState | "member" | null>(null);

  useEffect(() => {
    setState(hasAccess() ? "member" : getTrialState());
  }, []);

  const begin = () => {
    startTrial();
    events.trialStarted();
    router.push("/app");
  };

  return (
    <>
      <Navbar />
      <main className="flex flex-1 items-center justify-center bg-mist px-4 pb-24 pt-28">
        <div className="w-full max-w-md rounded-2xl border border-line bg-white p-8 text-center shadow-[0_16px_40px_-18px_rgba(12,45,77,0.35)]">
          {state === null ? null : state === "member" ? (
            <>
              <h1 className="font-display text-2xl font-bold text-ink">
                You already have full access.
              </h1>
              <Link
                href="/app"
                className="mt-6 inline-block rounded-full bg-leaf px-6 py-3 text-sm font-bold text-white transition-colors hover:bg-leaf-deep"
              >
                Open the app
              </Link>
            </>
          ) : state.status === "active" ? (
            <>
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-verdict-green/15 font-display text-2xl font-bold text-leaf-deep">
                {state.daysLeft}
              </div>
              <h1 className="mt-4 font-display text-2xl font-bold text-ink">
                Your trial is running. {state.daysLeft}{" "}
                {state.daysLeft === 1 ? "day" : "days"} left.
              </h1>
              <p className="mt-2 text-sm leading-relaxed text-ink-soft">
                Everything is open on this device. Enjoy it.
              </p>
              <Link
                href="/app"
                className="mt-6 inline-block rounded-full bg-brand px-6 py-3 text-sm font-bold text-white transition-colors hover:bg-brand-deep"
              >
                Open the app
              </Link>
            </>
          ) : state.status === "expired" ? (
            <>
              <h1 className="font-display text-2xl font-bold text-ink">
                Your free week is done.
              </h1>
              <p className="mt-2 text-sm leading-relaxed text-ink-soft">
                Keep every answer and the full Meal Builder for N1,500 a
                month, about N50 a day. Cancel any time.
              </p>
              <a
                href={NESTUGE_URL}
                className="mt-6 inline-block w-full rounded-full bg-brand px-6 py-3.5 text-sm font-bold text-white transition-colors hover:bg-brand-deep"
              >
                Subscribe for N1,500 / month
              </a>
              <p className="mt-4 text-xs text-ink-soft">
                Paid already?{" "}
                <Link
                  href="/unlock"
                  className="font-semibold text-brand hover:underline"
                >
                  Enter your access code
                </Link>
              </p>
            </>
          ) : (
            <>
              <p className="text-sm font-semibold text-leaf-deep">
                Free for 7 days. You do not need a card.
              </p>
              <h1 className="mt-2 font-display text-2xl font-bold text-ink">
                Open the whole app for one week, free.
              </h1>
              <ul className="mx-auto mt-5 max-w-xs space-y-2 text-left text-sm text-ink-soft">
                <li className="flex gap-2">
                  <span className="text-leaf">✓</span> Check as many foods as you
                  want, all 140+ of them
                </li>
                <li className="flex gap-2">
                  <span className="text-leaf">✓</span> Build a full meal and get
                  the fix that makes it green
                </li>
                <li className="flex gap-2">
                  <span className="text-leaf">✓</span> After the week it is
                  N1,500 a month, only if you want to keep it
                </li>
              </ul>
              <button
                onClick={begin}
                className="mt-6 w-full rounded-full bg-gradient-to-r from-brand to-leaf px-6 py-3.5 text-sm font-bold text-white shadow-[0_10px_24px_-10px_rgba(27,95,170,0.8)] transition-all hover:-translate-y-0.5"
              >
                Start my free week now
              </button>
              <p className="mt-3 text-xs text-ink-soft">
                Nothing is taken from you during the free week.
              </p>
            </>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
