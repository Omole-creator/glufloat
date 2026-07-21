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
import HabitStreak from "@/components/HabitStreak";
import VarietyNudge from "@/components/VarietyNudge";
import MonthReport from "@/components/MonthReport";
import TodaysMeal from "@/components/TodaysMeal";
import TypewriterHeadline from "@/components/TypewriterHeadline";
import CollapsibleCard from "@/components/CollapsibleCard";
import PushOptIn from "@/components/PushOptIn";
import WhatsAppChannelCard from "@/components/WhatsAppChannelCard";
import ChatWithFounder from "@/components/ChatWithFounder";
import { PAYSTACK_URL, pendingReference, clearPendingReference } from "@/lib/access";
import { getAccess, type Access } from "@/lib/account";
import { personalGreeting, currentMeal, checkBackMessage } from "@/lib/mealtime";
import type { Food } from "@/lib/types";

export default function AppPage() {
  const router = useRouter();
  const [tab, setTab] = useState<"search" | "meal">("search");
  const [access, setAccess] = useState<Access | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [name, setName] = useState<string | null>(null);
  // Seeds let one part of the app hand a food to another: a recent chip opens in
  // search, and a suggested or single food starts a meal in the builder.
  const [seedSearch, setSeedSearch] = useState<Food | null>(null);
  const [seedMeal, setSeedMeal] = useState<Food[] | null>(null);
  // The home is an accordion: one card open at a time. Starts on today's meal.
  const [openCard, setOpenCard] = useState<
    "meal" | "variety" | "check" | "doctor" | null
  >("meal");
  const toggle = (id: "meal" | "variety" | "check" | "doctor") =>
    setOpenCard((cur) => (cur === id ? null : id));

  // The check tools sit below the fold now, so bring them into view when a card
  // above hands a food or a meal down to them.
  const scrollToTools = () => {
    setTimeout(() => {
      document
        .getElementById("check-yourself")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 50);
  };
  const openInSearch = (food: Food) => {
    setSeedSearch(food);
    setTab("search");
    setOpenCard("check");
    scrollToTools();
  };
  const buildMeal = (foods: Food[]) => {
    // New array each time so the builder treats it as a fresh seed to load.
    setSeedMeal([...foods]);
    setTab("meal");
    setOpenCard("check");
    scrollToTools();
  };

  useEffect(() => {
    /**
     * A transfer or USSD payment can land minutes after the buyer left the
     * checkout. If this device is still holding an unsettled reference, try to
     * claim it once more before deciding what they may see. This is what saves
     * the buyer who paid by transfer under a different email than they signed up
     * with: the webhook would never match them, but the claim matches the
     * session. Costs one request, and only when a reference is actually pending.
     */
    async function settlePendingPayment() {
      const reference = pendingReference();
      if (!reference) return;
      const res = await fetch("/api/paystack/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reference }),
      }).catch(() => null);
      // 200 linked it, 402 means Paystack called it failed. Either way we are
      // done with this reference. A 202 means still settling: keep it for later.
      if (res && (res.ok || res.status === 402)) clearPendingReference();
    }

    (async () => {
      await settlePendingPayment();
      const { access, email, name } = await getAccess();
      setEmail(email);
      setName(name);
      if (access.status === "anon") {
        router.replace("/signin");
      } else if (access.status === "new") {
        router.replace("/trial");
      } else {
        setAccess(access);
      }
    })();
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
      : {
          label:
            access.daysLeft > 366
              ? "Membership: active"
              : `Membership: ${access.daysLeft} ${access.daysLeft === 1 ? "day" : "days"} left`,
          tone: "bg-brand/10 text-brand-deep",
        };
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
          <p className="font-display text-lg font-bold text-ink sm:text-xl">
            {personalGreeting(name)}
          </p>
          <div className={`mx-auto mt-4 flex w-fit items-center gap-2 rounded-full px-4 py-1.5 text-sm font-bold ${badge.tone}`}>
            <Clock className="h-4 w-4" />
            {badge.label}
          </div>
          <TypewriterHeadline
            text="Eat the food you love, the right way."
            className="mx-auto mt-2 max-w-lg text-center font-display text-3xl font-bold leading-tight text-ink sm:text-4xl"
          />

          {/* The home is an accordion of pronounced colour cards: today's meal
              (green), variety (green), check-yourself (blue+green), doctor
              (blue). One open at a time. */}
          <div className="mt-8 space-y-4">
            <TodaysMeal
              onBuild={buildMeal}
              open={openCard === "meal"}
              onToggle={() => toggle("meal")}
            />

            <VarietyNudge
              onOpenFood={openInSearch}
              open={openCard === "variety"}
              onToggle={() => toggle("variety")}
            />

            <div id="check-yourself" className="scroll-mt-24">
              <CollapsibleCard
                open={openCard === "check"}
                onToggle={() => toggle("check")}
                headerClass="bg-gradient-to-r from-brand to-leaf"
                borderClass="border-brand/40"
                header={
                  <span className="font-display text-xl font-bold leading-tight">
                    Or have a {currentMeal()} in mind? Seek guidance here.
                  </span>
                }
              >
                <div className="flex justify-center">
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

                <div className="mt-6">
                  {tab === "search" ? (
                    <SearchPanel
                      initialFood={seedSearch}
                      onBuildMeal={(food) => buildMeal([food])}
                    />
                  ) : (
                    <MealBuilder initialFoods={seedMeal} />
                  )}
                </div>

                {/* Ties the ritual to the next meal-time reminder. */}
                <div className="mt-6 flex items-center gap-2.5 rounded-xl bg-mist px-4 py-3 text-sm font-semibold text-ink">
                  <Clock className="h-4 w-4 shrink-0 text-brand" />
                  {checkBackMessage()}
                </div>
              </CollapsibleCard>
            </div>

            <MonthReport
              open={openCard === "doctor"}
              onToggle={() => toggle("doctor")}
            />
          </div>

          <div className="mt-6 space-y-4">
            <HabitStreak />
            <PushOptIn />
            <WhatsAppChannelCard />
          </div>
        </div>
      </main>

      <ChatWithFounder />

      <Footer />
    </>
  );
}
