"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Blocks, ClipboardList, Clock, Search } from "lucide-react";
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

/**
 * One of the three doors under today's meal. They are deliberately the same
 * size as each other and smaller than the meal card above: searching, building
 * and the doctor's report are what you do when the answer we gave you is not
 * the one you wanted, or when it is time to see the doctor.
 */
function DoorCard({
  icon,
  title,
  text,
  tone,
  active,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  text: string;
  tone: "blue" | "green";
  active: boolean;
  onClick: () => void;
}) {
  const chip =
    tone === "green"
      ? "bg-leaf/10 text-leaf-deep ring-leaf/15"
      : "bg-brand/10 text-brand ring-brand/15";
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={`flex h-full flex-col items-start gap-2 rounded-2xl bg-white p-3 text-left shadow-[0_4px_20px_-12px_rgba(12,42,71,0.2)] ring-1 transition-all hover:-translate-y-0.5 hover:shadow-[0_10px_28px_-14px_rgba(12,42,71,0.28)] sm:gap-2.5 sm:p-4 ${
        active
          ? tone === "green"
            ? "ring-2 ring-leaf/40"
            : "ring-2 ring-brand/40"
          : "ring-ink/[0.05]"
      }`}
    >
      <span
        className={`flex h-10 w-10 items-center justify-center rounded-xl ring-1 ring-inset ${chip}`}
      >
        {icon}
      </span>
      <span className="font-display text-sm font-bold leading-tight text-ink sm:text-base">
        {title}
      </span>
      {/* The one line of explanation is a nicety, not the label. On a phone the
          three doors sit side by side and it would squeeze them off the first
          screen, which is the meal's. */}
      <span className="hidden text-sm leading-snug text-ink-soft sm:block">
        {text}
      </span>
    </button>
  );
}

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
  /**
   * The home is arranged around the journey, not the features. Today's meal is
   * the first screen and is always open; the tools and the doctor's report are
   * escape routes under it, and only one of those two is open at a time. They
   * both start CLOSED, so nothing competes with the meal.
   */
  const [openCard, setOpenCard] = useState<"check" | "doctor" | null>(null);
  const toggle = (id: "check" | "doctor") =>
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
  const openTools = (which: "search" | "meal") => {
    setTab(which);
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

      <main className="relative flex-1 overflow-hidden bg-gradient-to-b from-mint/50 via-mist to-mist pb-24 pt-28">
        <div
          className="pointer-events-none absolute inset-x-0 -top-24 mx-auto h-64 max-w-2xl bg-gradient-to-br from-brand/15 via-leaf/10 to-transparent blur-3xl"
          aria-hidden
        />
        <div className="relative mx-auto max-w-3xl px-4 sm:px-6">
          <div className="flex items-center justify-between gap-3">
            <p className="font-display text-lg font-bold text-ink sm:text-xl">
              {personalGreeting(name)}
            </p>
            <div
              className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${badge.tone}`}
            >
              <Clock className="h-3.5 w-3.5" />
              {badge.label}
            </div>
          </div>
          {/* The founder's fixed line. It stays, but it is now one quiet line
              above the meal instead of a headline competing with it. */}
          <TypewriterHeadline
            text="Eat the food you love, the right way."
            className="mt-1 font-display text-base font-semibold leading-tight text-ink-soft sm:text-lg"
          />

          {/* Level 1: the answer they came for, owning the first screen. */}
          <div className="mt-6 space-y-4">
            <TodaysMeal onBuild={buildMeal} />

            <VarietyNudge onOpenFood={openInSearch} />

            {/* Level 2: the escape routes. Three equal doors, none of them
                shouting over the meal above. */}
            <div className="grid grid-cols-3 gap-2 sm:gap-3">
              <DoorCard
                icon={<Search className="h-5 w-5" strokeWidth={2.2} />}
                title="Search a food"
                text="Check any food you have in mind"
                tone="blue"
                active={openCard === "check" && tab === "search"}
                onClick={() => openTools("search")}
              />
              <DoorCard
                icon={<Blocks className="h-5 w-5" strokeWidth={2.2} />}
                title="Build a meal"
                text="Put your whole plate together"
                tone="green"
                active={openCard === "check" && tab === "meal"}
                onClick={() => openTools("meal")}
              />
              <DoorCard
                icon={<ClipboardList className="h-5 w-5" strokeWidth={2.2} />}
                title="Doctor's report"
                text="What you ate, ready to send"
                tone="blue"
                active={openCard === "doctor"}
                onClick={() => {
                  toggle("doctor");
                  setTimeout(() => {
                    document
                      .getElementById("doctor-report")
                      ?.scrollIntoView({ behavior: "smooth", block: "start" });
                  }, 50);
                }}
              />
            </div>

            {/* Level 3: whichever door they opened. */}
            <div id="check-yourself" className="scroll-mt-24">
              <CollapsibleCard
                open={openCard === "check"}
                onToggle={() => toggle("check")}
                tone={tab === "meal" ? "green" : "blue"}
                icon={
                  tab === "meal" ? (
                    <Blocks className="h-6 w-6" strokeWidth={2.2} />
                  ) : (
                    <Search className="h-6 w-6" strokeWidth={2.2} />
                  )
                }
                header={
                  <span className="font-display text-lg font-bold leading-snug text-ink">
                    {openCard === "check"
                      ? tab === "meal"
                        ? "Build your plate"
                        : "Check a food"
                      : `Or have a ${currentMeal()} in mind? Seek guidance here.`}
                  </span>
                }
              >
                {/* No tool toggle in here any more. The two cards above ARE the
                    toggle, and having both meant two buttons with the same name
                    doing the same job. */}
                <div className="mt-2">
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

            <div id="doctor-report" className="scroll-mt-24">
              <MonthReport
                open={openCard === "doctor"}
                onToggle={() => toggle("doctor")}
              />
            </div>
          </div>

          <div className="mt-6 space-y-3">
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
