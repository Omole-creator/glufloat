"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Clock } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import DisclaimerGate from "@/components/DisclaimerGate";
import FeedbackPopup from "@/components/FeedbackPopup";
import SearchPanel from "@/components/SearchPanel";
import MealBuilder from "@/components/MealBuilder";
import { PAYSTACK_URL } from "@/lib/access";
import { getAccess, signOut, type Access } from "@/lib/account";

export default function AppPage() {
  const router = useRouter();
  const [tab, setTab] = useState<"search" | "meal">("search");
  const [access, setAccess] = useState<Access | null>(null);
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    getAccess().then(({ access, email }) => {
      setEmail(email);
      if (access.status === "anon") {
        router.replace("/signin");
      } else if (access.status === "new") {
        router.replace("/trial");
      } else {
        setAccess(access);
      }
    });
  }, [router]);

  if (access === null) return null; // loading / redirecting

  // Prefill the buyer's account email on Paystack so the webhook can match the
  // payment to this account.
  const payUrl = email
    ? `${PAYSTACK_URL}?email=${encodeURIComponent(email)}`
    : PAYSTACK_URL;

  // Trial ended and no active subscription.
  if (access.status === "expired") {
    return (
      <>
        <Navbar />
        <main className="flex flex-1 items-center justify-center bg-mist px-4 pb-24 pt-28">
          <div className="w-full max-w-md rounded-2xl border border-line bg-white p-8 text-center shadow-[0_16px_40px_-18px_rgba(12,45,77,0.35)]">
            <h1 className="font-display text-2xl font-bold text-ink">
              Your free trial is over.
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-ink-soft">
              Keep every answer and the full Meal Builder for N1,500 a month,
              about N50 a day. Cancel any time.
            </p>
            <a
              href={payUrl}
              className="mt-6 inline-block w-full rounded-full bg-brand px-6 py-3.5 text-sm font-bold text-white transition-colors hover:bg-brand-deep"
            >
              Subscribe for N1,500 / month
            </a>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  // anon/new are redirected in the effect; only trial/subscribed render here.
  if (access.status !== "trial" && access.status !== "subscribed") return null;

  const badge =
    access.status === "trial"
      ? { label: `Free trial: ${access.daysLeft} ${access.daysLeft === 1 ? "day" : "days"} left`, tone: "bg-verdict-green/15 text-leaf-deep" }
      : { label: `Membership: ${access.daysLeft} ${access.daysLeft === 1 ? "day" : "days"} left`, tone: "bg-brand/10 text-brand-deep" };
  const renewSoon = access.status === "subscribed" && access.daysLeft <= 5;

  return (
    <>
      <Navbar />
      <DisclaimerGate />
      <FeedbackPopup />

      {renewSoon && (
        <div className="fixed inset-x-0 top-16 z-40 bg-verdict-yellow/95 px-4 py-2.5 text-center text-sm font-semibold text-ink shadow-md">
          Your month ends in {access.daysLeft} {access.daysLeft === 1 ? "day" : "days"}.{" "}
          <a href={payUrl} className="underline hover:text-brand-deep">
            Renew for N1,500 to keep Glufloat.
          </a>
        </div>
      )}

      <main className="flex-1 bg-mist pb-24 pt-28">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <p className="text-center text-xs font-bold uppercase tracking-widest text-brand">
            The Glufloat app
          </p>
          <div className={`mx-auto mt-3 flex w-fit items-center gap-2 rounded-full px-4 py-1.5 text-sm font-bold ${badge.tone}`}>
            <Clock className="h-4 w-4" />
            {badge.label}
          </div>
          <div className="mt-2 text-center">
            <button
              onClick={async () => {
                await signOut();
                router.replace("/");
              }}
              className="text-xs font-medium text-ink-soft/70 underline-offset-2 hover:text-ink hover:underline"
            >
              Sign out
            </button>
          </div>
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
