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
  UtensilsCrossed,
  X,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import SocialProofTicker from "@/components/SocialProofTicker";
import DisclaimerGate from "@/components/DisclaimerGate";
import FeedbackPopup from "@/components/FeedbackPopup";
import ToastHost from "@/components/Toast";
import SearchPanel from "@/components/SearchPanel";
import MealBuilder from "@/components/MealBuilder";
import VarietyNudge from "@/components/VarietyNudge";
import MonthReport from "@/components/MonthReport";
import TodaysMeal from "@/components/TodaysMeal";
import DashboardSnapshot from "@/components/DashboardSnapshot";
import FirstStepsChecklist from "@/components/FirstStepsChecklist";
import TodaysExtras from "@/components/TodaysExtras";
import LogReading from "@/components/LogReading";
import ReadingNudge from "@/components/ReadingNudge";
import TypewriterHeadline from "@/components/TypewriterHeadline";
import CollapsibleCard from "@/components/CollapsibleCard";
import DashboardBottomNav, { type DashboardTabDef } from "@/components/DashboardBottomNav";
import DashboardLeftNav from "@/components/DashboardLeftNav";
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
import { ADD_READING_FOR } from "@/lib/glucoseLog";
import type { Food } from "@/lib/types";

type DashboardTabId =
  | "todaysmeal"
  | "personalize"
  | "search"
  | "meal"
  | "report"
  | "dietitian";

/** Remembered on this device so a returning visitor lands where they left off. */
const DASHBOARD_TAB_KEY = "gf_dashboard_tab";
/** Whether this device has already seen the "click Fit me" landing hint. */
const FIT_ME_HINT_KEY = "gf_fitme_hint_seen";
const DEFAULT_TAB: DashboardTabId = "todaysmeal";
const TAB_IDS: DashboardTabId[] = [
  "todaysmeal",
  "personalize",
  "search",
  "meal",
  "report",
  "dietitian",
];

/**
 * Order matters here (founder request, 2026-08-30): "Today's meal" leads,
 * since landing on the dashboard should open straight onto the answer the
 * person came for — the calorie/month snapshot, the blue meal card, the
 * green extras card, and the sugar-test button all live inside THIS one
 * tab now (`activeTab === "todaysmeal"` further down), not in an
 * always-visible zone outside the tab system. "Chat with dietitian" is its
 * own tab with its own icon — never folded into "Doctor's report", even
 * though both are medical-adjacent — and is filtered out below for anyone
 * who is not entitled (`canUseDietitianChat`). **"My progress" was removed
 * entirely 2026-08-29** (founder instruction) — its content (HabitStreak,
 * PushOptIn, WhatsAppChannelCard) is no longer mounted in `/app`.
 */
const ALL_DASHBOARD_TABS: (DashboardTabDef & { id: DashboardTabId })[] = [
  {
    id: "todaysmeal",
    label: "Today's meal",
    shortLabel: "Today",
    icon: <UtensilsCrossed className="h-4.5 w-4.5" strokeWidth={2.2} />,
  },
  {
    id: "personalize",
    label: "Make it fit me",
    shortLabel: "Fit me",
    icon: <Target className="h-4.5 w-4.5" strokeWidth={2.2} />,
  },
  {
    id: "search",
    label: "Search any food",
    shortLabel: "Search",
    icon: <Search className="h-4.5 w-4.5" strokeWidth={2.2} />,
  },
  {
    id: "meal",
    label: "Build a meal",
    shortLabel: "Build",
    icon: <Blocks className="h-4.5 w-4.5" strokeWidth={2.2} />,
  },
  {
    id: "report",
    label: "Doctor's report",
    shortLabel: "Report",
    icon: <ClipboardList className="h-4.5 w-4.5" strokeWidth={2.2} />,
  },
  {
    id: "dietitian",
    label: "Chat with dietitian",
    shortLabel: "Chat",
    icon: <Stethoscope className="h-4.5 w-4.5" strokeWidth={2.2} />,
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
  // A one-time landing hint pointing at the bottom nav's "Fit me" icon, so a
  // first-time visitor knows where their daily calorie setup lives. Shown
  // once per device (gf_fitme_hint_seen), dismissed by its own close button
  // or by tapping "Fit me" itself.
  const [showFitMeHint, setShowFitMeHint] = useState(false);
  const dismissFitMeHint = () => {
    setShowFitMeHint(false);
    try {
      localStorage.setItem(FIT_ME_HINT_KEY, "1");
    } catch {
      /* ignore */
    }
  };

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

  // Every tab's content now lives in the one `#dashboard-panel` container —
  // there is no longer a separate always-visible zone or a special-cased
  // "personalize renders above it" panel, so a single scroll target works
  // for every tab.
  const scrollToPanel = () => {
    setTimeout(() => {
      document.getElementById("dashboard-panel")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 50);
  };
  const scrollToId = (id: string) => {
    setTimeout(() => {
      document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 60);
  };
  const selectTab = (id: string) => {
    const tab = id as DashboardTabId;
    setActiveTab(tab);
    scrollToPanel();
    if (tab === "personalize") dismissFitMeHint();
  };
  // Where "Save" in "Make it fit me" sends the person afterward, so they are
  // never left wondering whether it saved — the toast already confirms it,
  // and landing back on today's meal is the second, unmissable confirmation.
  // Must switch tabs first: TodaysMeal now lives inside the "todaysmeal" tab,
  // so scrolling to it while "personalize" is still active would target a
  // CSS-hidden element with no layout box.
  const scrollToMeal = () => {
    setActiveTab("todaysmeal");
    scrollToId("todays-meal");
  };
  const openInSearch = (food: Food) => {
    setSeedSearch(food);
    setActiveTab("search");
    scrollToPanel();
  };
  const buildMeal = (foods: Food[]) => {
    // New array each time so the builder treats it as a fresh seed to load.
    setSeedMeal([...foods]);
    setActiveTab("meal");
    scrollToPanel();
  };

  // The doctor's report tab asks LogReading to open for a specific meal via
  // this window event. LogReading now lives inside the "todaysmeal" tab
  // (not an always-visible zone any more), so opening it while "report" is
  // active would open a form nobody can see — switch tabs first, then
  // scroll to it, so the opened form actually lands on screen.
  useEffect(() => {
    function onAskReading() {
      setActiveTab("todaysmeal");
      scrollToId("log-reading");
    }
    window.addEventListener(ADD_READING_FOR, onAskReading);
    return () => window.removeEventListener(ADD_READING_FOR, onAskReading);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
        // The calorie-setup hint only means anything for someone who can
        // actually use "Fit me" for that (Plus/Dietitian, or a trial
        // previewing it), and only until they have seen it once.
        if (canUseGoalPersonalization(access)) {
          try {
            if (!localStorage.getItem(FIT_ME_HINT_KEY)) setShowFitMeHint(true);
          } catch {
            /* ignore */
          }
        }
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

      {/* A centered modal-style notice, not a corner toast (founder
          instruction, 2026-08-30: "should appear at the middle of the
          screen"), solid brand blue with white text (house rule: a surface
          is either blue or green, never a neutral dark card). Shown once per
          device. Dismissed by its own close button, tapping "Fit me" in the
          bottom nav, or tapping the backdrop. */}
      {showFitMeHint && (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center bg-ink/40 p-4"
          onClick={dismissFitMeHint}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-xs rounded-2xl bg-brand p-5 text-center shadow-[0_24px_60px_-20px_rgba(12,42,71,0.6)]"
          >
            <button
              type="button"
              onClick={dismissFitMeHint}
              aria-label="Dismiss"
              className="absolute right-3 top-3 text-white/70 transition-colors hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
            <p className="text-base font-semibold leading-snug text-white">
              Click &quot;Fit me&quot; below to set up your daily calorie intake.
            </p>
          </div>
        </div>
      )}

      {/* No overflow-hidden here: it clipped the decorative glow below (harmless
          to drop, since the glow sits above main's own top edge anyway) — and
          it would also break `position: sticky` on DashboardLeftNav below. */}
      <main className="relative flex-1 bg-gradient-to-b from-mint/50 via-mist to-mist pb-32 pt-36 md:pb-16">
        <div
          className="pointer-events-none absolute inset-x-0 -top-24 mx-auto h-64 max-w-2xl bg-gradient-to-br from-brand/15 via-leaf/10 to-transparent blur-3xl"
          aria-hidden
        />
        <div className="relative mx-auto max-w-3xl px-4 sm:px-6 md:max-w-5xl">
          {/* Desktop-only left nav (founder instruction) beside the content
              column; the mobile bottom bar (DashboardBottomNav, below) is
              untouched and hidden here via md:hidden instead. */}
          <div className="md:flex md:items-start md:gap-6">
            <div className="hidden md:block">
              <DashboardLeftNav tabs={dashboardTabs} active={activeTab} onSelect={selectTab} />
            </div>
            <div className="min-w-0 md:flex-1">
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

          {/* ONE panel container, ONE tab visible at a time — no more
              always-visible zone (founder instruction, 2026-08-30: clicking
              any nav icon must hide every OTHER panel's content, including
              the calorie/month snapshot and today's meal, not just swap the
              search/build/report/dietitian panels below them). Nothing here
              is ever unmounted when its tab is inactive — only hidden with
              CSS — so no component loses state or behaviour by being
              tabbed; `MonthReport` (Doctor's report) can still ask
              `LogReading` to open via the `ADD_READING_FOR` window event,
              which now also switches back to "todaysmeal" so the opened form
              actually lands on screen (see the effect above). */}
          <div id="dashboard-panel" className="mt-6 scroll-mt-24 space-y-4">
            <div className={activeTab === "todaysmeal" ? "space-y-4" : "hidden"}>
              {/* Calories remaining today + this month's good meals, always
                  horizontal, sitting above the meal card (founder
                  instruction) so it reads as the day's scoreboard before the
                  day's answer. Renders nothing until sex/age/weight/height/
                  activity are set in "Make it fit me" (calories) or until
                  there is a month of history (the month tile). */}
              <FirstStepsChecklist
                showFitMe={canUseGoalPersonalization(access)}
                onGoToFitMe={() => selectTab("personalize")}
                onGoToMeal={scrollToMeal}
              />

              <DashboardSnapshot show={canUseGoalPersonalization(access)} />

              <div id="todays-meal" className="scroll-mt-24">
                <TodaysMeal onBuild={buildMeal} personalize={canUseGoalPersonalization(access)} />
              </div>

              {/* The green extras card, directly under the blue meal card
                  (founder instruction, 2026-08-30) — its own component now,
                  not bundled inside DashboardSnapshot's tile row. */}
              <TodaysExtras show={canUseGoalPersonalization(access)} />

              {/* Straight under the answer, because a reading is the one
                  thing only this person can tell us, and the app can say
                  nothing about their own body until they do. */}
              <div id="log-reading" className="scroll-mt-24">
                <LogReading />
              </div>

              {/* Their own average when it is high, else where to spend the
                  next strip. Sits with the sugar test button because it is
                  about the same scarce thing. */}
              <ReadingNudge
                onOpenReport={() => {
                  setActiveTab("report");
                  scrollToPanel();
                }}
              />

              <VarietyNudge onOpenFood={openInSearch} />
            </div>

            {/* Saving sends the person down to today's meal (`onSaved`) so a
                save is never left ambiguous — the toast confirms it, landing
                on the meal card confirms it a second, unmissable way. */}
            <div className={activeTab === "personalize" ? "" : "hidden"}>
              <PersonalizationSettings
                showGoals={canUseGoalPersonalization(access)}
                onSaved={scrollToMeal}
              />
            </div>

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
          </div>
            </div>
          </div>
        </div>
      </main>

      <div className="md:hidden">
        <DashboardBottomNav tabs={dashboardTabs} active={activeTab} onSelect={selectTab} />
      </div>
    </>
  );
}
