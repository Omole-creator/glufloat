"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Blocks,
  ClipboardList,
  Clock,
  Search,
  Stethoscope,
  Target,
  TrendingUp,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import SocialProofTicker from "@/components/SocialProofTicker";
import Footer from "@/components/Footer";
import DisclaimerGate from "@/components/DisclaimerGate";
import FeedbackPopup from "@/components/FeedbackPopup";
import ToastHost from "@/components/Toast";
import SearchPanel from "@/components/SearchPanel";
import MealBuilder from "@/components/MealBuilder";
import HabitStreak from "@/components/HabitStreak";
import VarietyNudge from "@/components/VarietyNudge";
import MonthReport from "@/components/MonthReport";
import TodaysMeal from "@/components/TodaysMeal";
import LogReading from "@/components/LogReading";
import ReadingNudge from "@/components/ReadingNudge";
import TypewriterHeadline from "@/components/TypewriterHeadline";
import CollapsibleCard from "@/components/CollapsibleCard";
import DashboardNav, { type DashboardTabDef } from "@/components/DashboardNav";
import DashboardSidebar from "@/components/DashboardSidebar";
import PushOptIn from "@/components/PushOptIn";
import WhatsAppChannelCard from "@/components/WhatsAppChannelCard";
import ChatWithDietitian from "@/components/ChatWithDietitian";
import PersonalizationSettings from "@/components/PersonalizationSettings";
import { PAYSTACK_URLS, pendingReference, clearPendingReference } from "@/lib/access";
import { TIER_LABEL } from "@/lib/pricing";
import {
  getAccess,
  canUseGoalPersonalization,
  canUseDietitianChat,
  type Access,
} from "@/lib/account";
import { trackAppOpen } from "@/lib/usage";
import { personalGreeting, checkBackMessage } from "@/lib/mealtime";
import type { Food } from "@/lib/types";

type DashboardTabId =
  | "personalize"
  | "search"
  | "meal"
  | "report"
  | "dietitian"
  | "progress";

/** Remembered on this device so a returning visitor lands where they left off. */
const DASHBOARD_TAB_KEY = "gf_dashboard_tab";
const DEFAULT_TAB: DashboardTabId = "search";
const TAB_IDS: DashboardTabId[] = [
  "personalize",
  "search",
  "meal",
  "report",
  "dietitian",
  "progress",
];

/**
 * Order matters here (founder request): "Make it fit me" leads, since it is
 * the one tab that renders ABOVE today's meal instead of below it (see
 * `activeTab === "personalize"` further down). "Chat with dietitian" is its
 * own tab with its own icon — never folded into "Doctor's report", even
 * though both are medical-adjacent — and is filtered out below for anyone
 * who is not entitled (`canUseDietitianChat`).
 */
const ALL_DASHBOARD_TABS: (DashboardTabDef & { id: DashboardTabId })[] = [
  {
    id: "personalize",
    label: "Make it fit me",
    icon: <Target className="h-4.5 w-4.5" strokeWidth={2.2} />,
  },
  {
    id: "search",
    label: "Search any food",
    icon: <Search className="h-4.5 w-4.5" strokeWidth={2.2} />,
  },
  {
    id: "meal",
    label: "Build a meal",
    icon: <Blocks className="h-4.5 w-4.5" strokeWidth={2.2} />,
  },
  {
    id: "report",
    label: "Doctor's report",
    icon: <ClipboardList className="h-4.5 w-4.5" strokeWidth={2.2} />,
  },
  {
    id: "dietitian",
    label: "Chat with dietitian",
    icon: <Stethoscope className="h-4.5 w-4.5" strokeWidth={2.2} />,
  },
  {
    id: "progress",
    label: "My progress",
    icon: <TrendingUp className="h-4.5 w-4.5" strokeWidth={2.2} />,
  },
];

export default function AppPage() {
  const router = useRouter();
  const [access, setAccess] = useState<Access | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [name, setName] = useState<string | null>(null);
  // Seeds let one part of the app hand a food to another: a recent chip opens in
  // search, and a suggested or single food starts a meal in the builder.
  const [seedSearch, setSeedSearch] = useState<Food | null>(null);
  const [seedMeal, setSeedMeal] = useState<Food[] | null>(null);
  /**
   * The dashboard's one active tab. Generalizes the old openCard ("check" |
   * "doctor" | null) + tab ("search" | "meal") pair into a single value
   * covering all 5 sections. There is always exactly one active tab (no
   * "nothing open" state) so the dashboard never shows a blank panel.
   */
  const [activeTab, setActiveTabState] = useState<DashboardTabId>(DEFAULT_TAB);

  // Restore the last tab this device used. Runs after mount only, since
  // localStorage does not exist during server rendering.
  useEffect(() => {
    try {
      const saved = localStorage.getItem(DASHBOARD_TAB_KEY) as DashboardTabId | null;
      if (saved && TAB_IDS.includes(saved)) setActiveTabState(saved);
    } catch {
      /* ignore */
    }
  }, []);

  const setActiveTab = (id: DashboardTabId) => {
    setActiveTabState(id);
    try {
      localStorage.setItem(DASHBOARD_TAB_KEY, id);
    } catch {
      /* ignore */
    }
  };

  // Every tab's content sits below the daily-essentials zone EXCEPT
  // "personalize", which renders above it (see the JSX below) — so the
  // scroll target has to match wherever that tab's content actually is, or
  // picking "Make it fit me" would scroll straight past it into empty space.
  const scrollToPanel = (tab: DashboardTabId) => {
    const targetId = tab === "personalize" ? "dashboard-personalize" : "dashboard-panel";
    setTimeout(() => {
      document.getElementById(targetId)?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 50);
  };
  const selectTab = (id: string) => {
    const tab = id as DashboardTabId;
    setActiveTab(tab);
    scrollToPanel(tab);
  };
  const openInSearch = (food: Food) => {
    setSeedSearch(food);
    setActiveTab("search");
    scrollToPanel("search");
  };
  const buildMeal = (foods: Food[]) => {
    // New array each time so the builder treats it as a fresh seed to load.
    setSeedMeal([...foods]);
    setActiveTab("meal");
    scrollToPanel("meal");
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
        // A real open, by somebody who got in. Counted at most once every half
        // hour, so a reload is not a second visit.
        trackAppOpen();
      }
    })();
  }, [router]);

  if (access === null) return null; // loading / redirecting

  // Prefill the buyer's account email on Paystack so the webhook can match the
  // payment to this account.
  const withEmail = (url: string) =>
    email ? `${url}?email=${encodeURIComponent(email)}` : url;

  // Trial ended and no active subscription. This is the SINGLE paywall — the
  // landing page never links straight to Paystack, it always lands here.
  if (access.status === "expired") {
    const TIER_COPY: { tier: "basic" | "plus" | "dietitian"; price: string; blurb: string }[] = [
      { tier: "basic", price: "N1,500", blurb: "Every answer and the full Meal Builder" },
      { tier: "plus", price: "N2,500", blurb: "Basic, plus meals picked around your goal" },
      { tier: "dietitian", price: "N4,500", blurb: "Plus, and a dietitian in your corner" },
    ];
    // A renewal is highlighted at the SAME tier they last paid for, never a
    // silent downgrade to Basic pricing. Someone who never paid starts at
    // Basic, same as before.
    const currentTier = access.previousTier ?? "basic";
    return (
      <>
        <SocialProofTicker />
        <Navbar />
        <main className="flex flex-1 items-center justify-center bg-mist px-4 pb-24 pt-36">
          <div className="w-full max-w-md rounded-2xl border border-line bg-white p-8 text-center shadow-[0_16px_40px_-18px_rgba(12,45,77,0.35)]">
            {/* Somebody who paid us last month must never be told their free trial
                is over. `lapsed` is how getAccess tells the two apart. */}
            <h1 className="font-display text-2xl font-bold text-ink">
              {access.lapsed ? "Your month is over." : "Your free trial is over."}
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-ink-soft">
              Choose a plan to keep Glufloat. Cancel any time.
            </p>
            <div className="mt-6 space-y-3">
              {TIER_COPY.map((t) => (
                <a
                  key={t.tier}
                  href={withEmail(PAYSTACK_URLS[t.tier])}
                  className={`block rounded-2xl border p-4 text-left transition-colors ${
                    t.tier === currentTier
                      ? "border-brand bg-brand/5"
                      : "border-line hover:border-brand/40"
                  }`}
                >
                  <span className="flex items-center justify-between">
                    <span className="font-display text-sm font-bold text-ink">
                      {TIER_LABEL[t.tier]} — {t.price} / month
                    </span>
                    {t.tier === currentTier && (
                      <span className="rounded-full bg-brand px-2.5 py-0.5 text-xs font-bold text-white">
                        {access.lapsed ? "Renew" : "Your plan"}
                      </span>
                    )}
                  </span>
                  <span className="mt-1 block text-sm text-ink-soft">{t.blurb}</span>
                </a>
              ))}
            </div>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  // anon/new are redirected in the effect; only trial/subscribed render here.
  if (access.status !== "trial" && access.status !== "subscribed") return null;

  // "Chat with dietitian" only ever shows for someone actually entitled to it
  // — never during trial (canUseDietitianChat is false for every trial Access
  // value by construction), same gate the old inline card used.
  const dashboardTabs = ALL_DASHBOARD_TABS.filter(
    (t) => t.id !== "dietitian" || canUseDietitianChat(access),
  );

  // The badge names the actual plan a subscriber is on, not just "Membership"
  // — someone paying for Plus or Premium should see that reflected, not a
  // generic label that reads the same for every tier.
  const badge =
    access.status === "trial"
      ? { label: `Free trial: ${access.daysLeft} ${access.daysLeft === 1 ? "day" : "days"} left`, tone: "bg-verdict-green/15 text-leaf-deep" }
      : {
          label:
            access.daysLeft > 366
              ? `${TIER_LABEL[access.tier]}: active`
              : `${TIER_LABEL[access.tier]}: ${access.daysLeft} ${access.daysLeft === 1 ? "day" : "days"} left`,
          tone: "bg-brand/10 text-brand-deep",
        };
  const renewSoon = access.status === "subscribed" && access.daysLeft <= 5;
  // A trial used to run out with no warning at all: a green day count, then a locked
  // door the next morning. daysLeft is TRIAL_DAYS on the start day, so 1 is the last
  // day whatever the length.
  const trialEnding = access.status === "trial" && access.daysLeft <= 1;
  const renewPriceLabel =
    access.status === "subscribed"
      ? { basic: "N1,500", plus: "N2,500", dietitian: "N4,500" }[access.tier]
      : "";
  const renewUrl = access.status === "subscribed" ? withEmail(PAYSTACK_URLS[access.tier]) : "";

  return (
    <>
      <SocialProofTicker />
      <Navbar />
      <DisclaimerGate />
      <FeedbackPopup />
      <ToastHost />

      {renewSoon && (
        <div className="fixed inset-x-0 top-24 z-40 bg-verdict-yellow/95 px-4 py-2.5 text-center text-sm font-semibold text-ink shadow-md">
          Your month ends in {access.daysLeft} {access.daysLeft === 1 ? "day" : "days"}.{" "}
          <a href={renewUrl} className="underline hover:text-brand-deep">
            Renew for {renewPriceLabel} to keep Glufloat.
          </a>
        </div>
      )}

      {/* The two banners cannot both show: one is trial, the other subscribed.
          Trial previewed goal-based personalization across all 3 plans, so the
          banner sends them to compare plans rather than assuming one tier. */}
      {trialEnding && (
        <div className="fixed inset-x-0 top-24 z-40 bg-verdict-yellow/95 px-4 py-2.5 text-center text-sm font-semibold text-ink shadow-md">
          Your free trial ends tomorrow.{" "}
          <a href="/#pricing" className="underline hover:text-brand-deep">
            Choose a plan to keep Glufloat.
          </a>
        </div>
      )}

      {/* No overflow-hidden here: it clipped the decorative glow below (harmless
          to drop, since the glow sits above main's own top edge anyway), but it
          also silently breaks position:sticky on any descendant — which the
          dashboard sidebar needs to stay visible while scrolling. */}
      <main className="relative flex-1 bg-gradient-to-b from-mint/50 via-mist to-mist pb-24 pt-36">
        <div
          className="pointer-events-none absolute inset-x-0 -top-24 mx-auto h-64 max-w-2xl bg-gradient-to-br from-brand/15 via-leaf/10 to-transparent blur-3xl"
          aria-hidden
        />
        <div className="relative mx-auto max-w-6xl px-4 sm:px-6">
          <div className="flex gap-6">
            {/* Desktop-only: a real left sidebar, so /app reads as a dashboard
                on a wide screen instead of one long scroll. Hidden below md —
                the phone keeps the horizontal nav below, unchanged. Both
                drive the exact same activeTab state. */}
            <DashboardSidebar tabs={dashboardTabs} active={activeTab} onSelect={selectTab} />

            <div className="min-w-0 max-w-3xl flex-1">
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

          {/* "Make it fit me" is the one tab that renders ABOVE today's meal
              instead of below it with the rest of the dashboard panels
              (founder request) — everything else about it (always mounted,
              only hidden with CSS, its own complete white card with its own
              heading) is unchanged from the other panels further down. */}
          <div
            id="dashboard-personalize"
            className={activeTab === "personalize" ? "mt-6 scroll-mt-24" : "hidden"}
          >
            <PersonalizationSettings showGoals={canUseGoalPersonalization(access)} />
          </div>

          {/* Daily-essentials zone: always visible, no button needed. TodaysMeal
              is the reason someone opened the app (never collapsed, a standing
              house rule), and LogReading must stay mounted and visible here —
              the doctor's report panel below can ask it to open via the
              ADD_READING_FOR window event, and that only works if LogReading is
              not hidden away behind a different dashboard tab. */}
          <div className="mt-6 space-y-4">
            <TodaysMeal onBuild={buildMeal} personalize={canUseGoalPersonalization(access)} />

            {/* Straight under the answer, because a reading is the one thing
                only this person can tell us, and the app can say nothing about
                their own body until they do. */}
            <LogReading />

            {/* Their own average when it is high, else where to spend the next
                strip. Sits with the sugar test button because it is about the
                same scarce thing. */}
            <ReadingNudge
              onOpenReport={() => {
                setActiveTab("report");
                scrollToPanel("report");
              }}
            />

            <VarietyNudge onOpenFood={openInSearch} />
          </div>

          {/* The dashboard: one button row, one panel. Everything else that
              used to be a long scroll (search, build, the doctor's report,
              the always-open settings panel, and the bottom widget stack) now
              lives behind a clearly labelled button. Nothing below is ever
              unmounted when its tab is inactive — it is only hidden with CSS
              — so no component loses state or behaviour by being tabbed. */}
          <div className="mt-6 md:hidden">
            <DashboardNav tabs={dashboardTabs} active={activeTab} onSelect={selectTab} />
          </div>

          <div id="dashboard-panel" className="mt-4 scroll-mt-24 space-y-4">
            <div className={activeTab === "search" ? "" : "hidden"}>
              <CollapsibleCard
                open={activeTab === "search"}
                onToggle={() => selectTab("search")}
                tone="blue"
                icon={<Search className="h-6 w-6" strokeWidth={2.2} />}
                header={
                  <span className="font-display text-lg font-bold leading-snug text-ink">
                    Check a food
                  </span>
                }
              >
                <div className="mt-2">
                  <SearchPanel
                    initialFood={seedSearch}
                    onBuildMeal={(food) => buildMeal([food])}
                  />
                </div>
                {/* Ties the ritual to the next meal-time reminder. */}
                <div className="mt-6 flex items-center gap-2.5 rounded-xl bg-mist px-4 py-3 text-sm font-semibold text-ink">
                  <Clock className="h-4 w-4 shrink-0 text-brand" />
                  {checkBackMessage()}
                </div>
              </CollapsibleCard>
            </div>

            <div className={activeTab === "meal" ? "" : "hidden"}>
              <CollapsibleCard
                open={activeTab === "meal"}
                onToggle={() => selectTab("meal")}
                tone="green"
                icon={<Blocks className="h-6 w-6" strokeWidth={2.2} />}
                header={
                  <span className="font-display text-lg font-bold leading-snug text-ink">
                    Build your plate
                  </span>
                }
              >
                <div className="mt-2">
                  <MealBuilder initialFoods={seedMeal} />
                </div>
                <div className="mt-6 flex items-center gap-2.5 rounded-xl bg-mist px-4 py-3 text-sm font-semibold text-ink">
                  <Clock className="h-4 w-4 shrink-0 text-brand" />
                  {checkBackMessage()}
                </div>
              </CollapsibleCard>
            </div>

            <div className={activeTab === "report" ? "" : "hidden"}>
              <MonthReport open={activeTab === "report"} onToggle={() => selectTab("report")} />
            </div>

            {/* Its own tab with its own icon — never folded into "Doctor's
                report", even though both are medical-adjacent. Dietitian
                tier only; the tab itself is already filtered out of
                `dashboardTabs` for anyone not entitled, so this can never be
                the active tab for them, but the access check stays here too
                (same belt-and-suspenders pattern as the rest of the app). */}
            {canUseDietitianChat(access) && (
              <div className={activeTab === "dietitian" ? "" : "hidden"}>
                <ChatWithDietitian />
              </div>
            )}

            <div className={activeTab === "progress" ? "" : "hidden"}>
              <div className="space-y-3">
                <HabitStreak />
                <PushOptIn />
                <WhatsAppChannelCard />
              </div>
            </div>
          </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </>
  );
}
