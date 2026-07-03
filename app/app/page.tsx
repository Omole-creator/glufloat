"use client";

import { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import DisclaimerGate from "@/components/DisclaimerGate";
import SearchPanel from "@/components/SearchPanel";
import MealBuilder from "@/components/MealBuilder";
import { getTrialState, hasAccess, type TrialState } from "@/lib/access";

export default function AppPage() {
  const [tab, setTab] = useState<"search" | "meal">("search");
  const [trial, setTrial] = useState<TrialState | "member" | null>(null);

  useEffect(() => {
    setTrial(hasAccess() ? "member" : getTrialState());
  }, []);

  return (
    <>
      <Navbar />
      <DisclaimerGate />

      <main className="flex-1 bg-mist pb-24 pt-28">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <p className="text-center text-xs font-bold uppercase tracking-widest text-brand">
            The Glufloat app
          </p>
          {trial !== null && trial !== "member" && trial.status === "active" && (
            <p className="mx-auto mt-3 w-fit rounded-full bg-verdict-green/15 px-4 py-1.5 text-xs font-bold text-leaf-deep">
              Free trial: {trial.daysLeft} {trial.daysLeft === 1 ? "day" : "days"} left
            </p>
          )}
          <h1 className="mt-2 text-center font-display text-3xl font-bold text-ink sm:text-4xl">
            Check your food before you eat it.
          </h1>
          <p className="mx-auto mt-3 max-w-md text-center text-sm leading-relaxed text-ink-soft">
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
