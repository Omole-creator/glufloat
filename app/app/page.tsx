"use client";

import { useEffect, useState } from "react";
import { Clock } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import DisclaimerGate from "@/components/DisclaimerGate";
import FeedbackPopup from "@/components/FeedbackPopup";
import SearchPanel from "@/components/SearchPanel";
import MealBuilder from "@/components/MealBuilder";
import {
  getRenewalState,
  getTrialState,
  hasAccess,
  NESTUGE_URL,
  type RenewalState,
  type TrialState,
} from "@/lib/access";

export default function AppPage() {
  const [tab, setTab] = useState<"search" | "meal">("search");
  const [trial, setTrial] = useState<TrialState | "member" | null>(null);
  const [renewal, setRenewal] = useState<RenewalState>({ status: "none" });

  useEffect(() => {
    setTrial(hasAccess() ? "member" : getTrialState());
    setRenewal(getRenewalState());
  }, []);

  return (
    <>
      <Navbar />
      <DisclaimerGate />
      <FeedbackPopup />

      {(renewal.status === "due" || renewal.status === "over") && (
        <div className="fixed inset-x-0 top-16 z-40 bg-verdict-yellow/95 px-4 py-2.5 text-center text-sm font-semibold text-ink shadow-md">
          {renewal.status === "over"
            ? "Your month has ended. "
            : `Your month ends in ${renewal.daysLeft} ${renewal.daysLeft === 1 ? "day" : "days"}. `}
          <a href={NESTUGE_URL} className="underline hover:text-brand-deep">
            Renew for N1,500 to keep GluFloat.
          </a>
        </div>
      )}

      <main className="flex-1 bg-mist pb-24 pt-28">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <p className="text-center text-xs font-bold uppercase tracking-widest text-brand">
            The Glufloat app
          </p>
          {trial !== null && trial !== "member" && trial.status === "active" && (
            <div className="mx-auto mt-3 flex w-fit items-center gap-2 rounded-full bg-verdict-green/15 px-4 py-1.5 text-sm font-bold text-leaf-deep">
              <Clock className="h-4 w-4" />
              Free trial: {trial.daysLeft} {trial.daysLeft === 1 ? "day" : "days"} left
            </div>
          )}
          <h1 className="mt-2 text-center font-display text-3xl font-bold text-ink sm:text-4xl">
            Check your food before you eat it.
          </h1>
          <p className="mx-auto mt-3 max-w-md text-center font-display text-sm leading-relaxed text-ink-soft">
            Check one food, or add your whole meal and get one answer with the
            fix.
          </p>

          <div className="mt-8 flex justify-center">
            <div className="inline-flex rounded-full border border-line bg-white p-1 shadow-sm">
              <button
                onClick={() => setTab("search")}
                className={`rounded-full px-5 py-2.5 text-sm font-semibold transition-colors ${
                  tab === "search"
                    ? "bg-brand text-white"
                    : "text-ink-soft hover:text-ink"
                }`}
              >
                Search a food
              </button>
              <button
                onClick={() => setTab("meal")}
                className={`rounded-full px-5 py-2.5 text-sm font-semibold transition-colors ${
                  tab === "meal"
                    ? "bg-leaf text-white"
                    : "text-ink-soft hover:text-ink"
                }`}
              >
                Build a meal
              </button>
            </div>
          </div>

          <div className="mt-8">
            {tab === "search" ? <SearchPanel /> : <MealBuilder />}
          </div>
        </div>
      </main>

      <Footer />
    </>
  );
}
