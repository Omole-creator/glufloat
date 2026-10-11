"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { Check, Droplet, Timer, X } from "lucide-react";
import { dangerLine, echoLine, formatBoth, formatMgdl, formatMmol, parseReading } from "@/lib/glucose";
import { READINGS_CHANGED, giveHealthConsent, hasHealthConsent } from "@/lib/glucoseLog";
import { INTAKE_CHANGED } from "@/lib/history";
import { displayLabel } from "@/lib/foodName";
import {
  TEST_AFTER_MIN,
  dueAt,
  dueState,
  formatChange,
  mealTestFor,
  mealTestNumber,
  minutesLabel,
  minutesToDue,
  timeLabel,
} from "@/lib/mealResponse";
import { activeMealTest, closeMealTest, saveAfterTest, type ActiveMealTest } from "@/lib/mealTestLog";
import { trackUsage } from "@/lib/usage";
import { showToast } from "./Toast";

/** "1 hour 20 minutes", said the way a person says it. */
function wait(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  const hs = h === 1 ? "1 hour" : `${h} hours`;
  const ms = m === 1 ? "1 minute" : `${m} minutes`;
  if (h === 0) return ms;
  if (m === 0) return hs;
  return `${hs} ${ms}`;
}

const BLUE = "bg-gradient-to-br from-[#0B2E5C] via-[#124A8C] to-[#1B5FAA]";

/**
 * The two tests of a meal test, as two steps on a line: the one before eating
 * and the one 2 hours after. It is what makes "where am I?" plain at a glance.
 * `tone` is the card it sits on (white text on blue, dark text on white).
 */
function TwoTests({
  before,
  after,
  afterActive,
  tone,
}: {
  before: string;
  after: string;
  afterActive: boolean;
  tone: "blue" | "white";
}) {
  const onBlue = tone === "blue";
  const dot = (state: "done" | "active" | "todo") =>
    state === "done" ? (
      <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${onBlue ? "bg-white text-brand" : "bg-brand text-white"}`}>
        <Check className="h-4 w-4" strokeWidth={3} />
      </span>
    ) : (
      <span
        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 ${
          state === "active"
            ? onBlue
              ? "border-white bg-white/20"
              : "border-leaf bg-leaf/10"
            : onBlue
              ? "border-white/40"
              : "border-line"
        }`}
      >
        <span className={`h-2 w-2 rounded-full ${state === "active" ? (onBlue ? "bg-white" : "bg-leaf") : "bg-transparent"}`} />
      </span>
    );
  const label = onBlue ? "text-white/70" : "text-ink-soft";
  const value = onBlue ? "text-white" : "text-ink";
  return (
    <ol className="relative space-y-4">
      <span
        aria-hidden
        className={`absolute left-[13px] top-7 h-[calc(100%-3.25rem)] w-0.5 ${onBlue ? "bg-white/25" : "bg-line"}`}
      />
      <li className="relative flex items-center gap-3">
        {dot("done")}
        <div className="min-w-0">
          <p className={`text-xs font-semibold ${label}`}>Before eating</p>
          <p className={`text-sm font-bold ${value}`}>{before}</p>
        </div>
      </li>
      <li className="relative flex items-center gap-3">
        {dot(afterActive ? "active" : "todo")}
        <div className="min-w-0">
          <p className={`text-xs font-semibold ${label}`}>2 hours after eating</p>
          <p className={`text-sm font-bold ${value}`}>{after}</p>
        </div>
      </li>
    </ol>
  );
}

/** A ring that fills as the 2 hours pass, with the time left inside it. */
function ClockRing({ left }: { left: number }) {
  const r = 30;
  const c = 2 * Math.PI * r;
  const passed = Math.min(1, Math.max(0, (TEST_AFTER_MIN - left) / TEST_AFTER_MIN));
  return (
    <div className="relative h-20 w-20 shrink-0">
      <span className="sr-only">That&apos;s in about {wait(left)}.</span>
      <svg viewBox="0 0 72 72" className="h-20 w-20 -rotate-90" aria-hidden>
        <circle cx="36" cy="36" r={r} fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="6" />
        <circle
          cx="36"
          cy="36"
          r={r}
          fill="none"
          stroke="white"
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - passed)}
          className="clock-fill"
        />
      </svg>
      <span aria-hidden className="absolute inset-0 flex flex-col items-center justify-center text-white">
        <span className="font-display text-base font-bold leading-none">{minutesLabel(left)}</span>
        <span className="mt-0.5 text-[10px] font-semibold uppercase tracking-wider text-white/70">left</span>
      </span>
    </div>
  );
}

/** One sugar number for a narrow box: mg/dL first, mmol/L under it. */
function Num({ mgdl }: { mgdl: number }) {
  return (
    <>
      <span className="block text-sm font-bold text-ink">{formatMgdl(mgdl)}</span>
      <span className="block text-[11px] text-ink-soft">{formatMmol(mgdl)}</span>
    </>
  );
}

/** The meal's name and when it started, under the card's label. */
function MealLine({ name, sub, onBlue }: { name: string; sub: ReactNode; onBlue: boolean }) {
  return (
    <div className="mt-3">
      <p className={`font-display text-lg font-bold leading-snug ${onBlue ? "text-white" : "text-ink"}`}>{name}</p>
      <p className={`mt-0.5 text-xs ${onBlue ? "text-white/70" : "text-ink-soft"}`}>{sub}</p>
    </div>
  );
}

/**
 * The 2-hour check of a MEAL TEST, at the top of the home screen.
 *
 * Three faces, one card: the meal is running ("test again at 3:00pm"), the test
 * is due (type the number), and the result ("Meal test complete": before, after,
 * change). It reads the database, so a test started on one phone is finished on
 * another. It shows nothing at all when there is no meal test today.
 *
 * Redesigned 2026-10-11 (founder: the words were "poorly arranged and confusing
 * to read"). Each face now reads top to bottom in the order a person thinks:
 * what this is, which meal, where they are in the two tests, then the one thing
 * to do. The two tests are drawn as two steps on a line on every face.
 *
 * Like every sugar test in the app, the result is a number and never a grade:
 * the change carries no colour and no word about whether it is good.
 */
export default function MealTestDue({ onOpenReport }: { onOpenReport: () => void }) {
  const [active, setActive] = useState<ActiveMealTest | null>(null);
  const [now, setNow] = useState(() => new Date());
  const [typed, setTyped] = useState("");
  const [needConsent, setNeedConsent] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState("");

  const load = useCallback(() => {
    void activeMealTest().then(setActive);
  }, []);

  useEffect(() => {
    load();
    void hasHealthConsent().then((ok) => setNeedConsent(!ok));
    window.addEventListener(INTAKE_CHANGED, load);
    window.addEventListener(READINGS_CHANGED, load);
    // The clock moves the card from "running" to "due" with no reload.
    const t = setInterval(() => setNow(new Date()), 30_000);
    return () => {
      window.removeEventListener(INTAKE_CHANGED, load);
      window.removeEventListener(READINGS_CHANGED, load);
      clearInterval(t);
    };
  }, [load]);

  if (!active) return null;
  const { meal, test } = active;
  const name = displayLabel(meal.label);
  const close = () => {
    closeMealTest(meal.id);
    setActive(null);
  };
  const beforeText = test.before ? formatBoth(test.before.mgdl) : "No test";

  // ---- done: the result ----------------------------------------------------
  if (test.after) {
    return (
      <section
        id="meal-test"
        aria-label="Meal test result"
        className="relative scroll-mt-24 overflow-hidden rounded-3xl bg-white shadow-[0_8px_30px_-14px_rgba(12,42,71,0.3)] ring-1 ring-ink/[0.05]"
      >
        <div className="flex items-center justify-between gap-3 bg-gradient-to-r from-[#1f7a3a] to-[#3eb35f] px-5 py-3 text-white">
          <p className="flex items-center gap-2 font-display text-base font-bold">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white text-leaf-deep">
              <Check className="h-3.5 w-3.5" strokeWidth={3.5} />
            </span>
            {test.before ? "Meal test complete" : "2-hour test saved"}
          </p>
          <button
            onClick={close}
            aria-label="Close the meal test result"
            className="-mr-1 flex h-8 w-8 items-center justify-center rounded-full text-white/80 transition-colors hover:bg-white/15 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-5">
          <MealLine
            name={name}
            sub={
              <>
                Started {timeLabel(test.mealTime)} · Record {mealTestNumber(meal.id)}
              </>
            }
            onBlue={false}
          />

          {/* Before, after and the change, side by side. No colour on any of
              them: a number is shown back, never graded. */}
          <dl className={`mt-4 grid gap-2 text-center ${test.change !== null ? "grid-cols-3" : "grid-cols-2"}`}>
            <div className="rounded-2xl bg-mist px-2 py-3">
              <dt className="text-[11px] font-semibold text-ink-soft">Before eating</dt>
              <dd className="mt-1">
                {test.before ? <Num mgdl={test.before.mgdl} /> : <span className="text-sm font-bold text-ink">No test</span>}
              </dd>
            </div>
            <div className="rounded-2xl bg-mist px-2 py-3">
              <dt className="text-[11px] font-semibold text-ink-soft">
                {test.minutesAfter !== null ? `${minutesLabel(test.minutesAfter)} after` : "After eating"}
              </dt>
              <dd className="mt-1">
                <Num mgdl={test.after.mgdl} />
              </dd>
            </div>
            {test.change !== null && (
              <div className="rounded-2xl bg-brand/5 px-2 py-3 ring-1 ring-brand/15">
                <dt className="text-[11px] font-semibold text-ink-soft">Change</dt>
                <dd className="mt-1 font-display text-base font-bold text-ink">{formatChange(test.change)}</dd>
              </div>
            )}
          </dl>

          <p className="mt-4 text-sm text-ink-soft">
            {test.before
              ? "Saved to your report."
              : "Saved to your report. Next time, test before you eat too, so your doctor can see the change."}
          </p>
          {dangerLine(test.after.mgdl) && (
            <p className="mt-3 rounded-2xl border border-verdict-red/50 bg-verdict-red/5 px-4 py-3 text-sm font-semibold text-ink">
              {dangerLine(test.after.mgdl)}
            </p>
          )}
          <div className="mt-4 grid grid-cols-2 gap-2">
            <button
              onClick={onOpenReport}
              className="rounded-full bg-brand px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-brand-deep"
            >
              See my report
            </button>
            <button
              onClick={close}
              className="rounded-full border-2 border-line bg-white px-5 py-3 text-sm font-bold text-ink transition-colors hover:border-brand"
            >
              Done
            </button>
          </div>
        </div>
      </section>
    );
  }

  const state = dueState(test.mealTime, now);
  if (state === "over") return null;

  const dueTime = timeLabel(dueAt(test.mealTime).toISOString());

  // ---- running: not yet time ---------------------------------------------
  // A white card with one blue panel: it sits right above the deep-blue meal
  // card, and two blue cards in a row read as one.
  if (state === "waiting") {
    const left = minutesToDue(test.mealTime, now);
    return (
      <section
        id="meal-test"
        aria-label="Meal test running"
        className="relative scroll-mt-24 overflow-hidden rounded-3xl bg-white p-5 shadow-[0_8px_30px_-14px_rgba(12,42,71,0.3)] ring-1 ring-brand/20"
      >
        <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-brand">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand/60 motion-reduce:animate-none" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-brand" />
          </span>
          <Timer className="h-4 w-4" /> Meal test running
        </p>
        <MealLine name={name} sub={<>You started eating at {timeLabel(test.mealTime)}.</>} onBlue={false} />

        {/* The one thing to remember: when to test again. */}
        <div className={`relative mt-4 flex items-center gap-4 overflow-hidden rounded-2xl ${BLUE} p-4 text-white`}>
          <div aria-hidden className="pointer-events-none absolute -right-10 -top-12 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
          <ClockRing left={left} />
          <div className="relative min-w-0">
            <p className="text-sm text-white/80">Test your sugar again at</p>
            <p className="font-display text-3xl font-bold leading-tight">{dueTime}</p>
          </div>
        </div>

        <div className="mt-5">
          <TwoTests before={beforeText} after={`At ${dueTime}`} afterActive={false} tone="white" />
        </div>

        <button
          onClick={close}
          className="mt-5 text-xs font-semibold text-ink-soft underline-offset-2 hover:text-ink hover:underline"
        >
          Stop this meal test
        </button>
      </section>
    );
  }

  // ---- due: type the number ----------------------------------------------
  const parsed = parseReading(typed);
  const refer = parsed ? dangerLine(parsed.mgdl) : null;
  const save = async () => {
    if (!parsed) {
      setProblem("Type the number on your meter, like 6.5 or 140.");
      return;
    }
    if (needConsent && !agreed) {
      setProblem("Tick the box so GluFloat can save your sugar test.");
      return;
    }
    setBusy(true);
    setProblem("");
    if (needConsent && agreed) await giveHealthConsent();
    const saved = await saveAfterTest(meal.id, parsed);
    setBusy(false);
    if (!saved) {
      setProblem("This did not save. Check your internet and try again.");
      return;
    }
    setNeedConsent(false);
    setTyped("");
    showToast("Saved");
    // Show the result at once rather than waiting on the reload a slow
    // connection can take seconds over; the reload then confirms it.
    const after = [...meal.readings, { ...saved, context: "after_meal" as const }];
    setActive({
      meal: { ...meal, readings: after },
      test: mealTestFor({
        id: meal.id,
        kind: meal.kind,
        label: meal.label,
        checkedAt: meal.checkedAt,
        startedAt: test.mealTime,
        before: meal.beforeReadings,
        after,
      }),
    });
  };

  return (
    <section
      id="meal-test"
      aria-label="Your 2-hour sugar test"
      className="relative scroll-mt-24 overflow-hidden rounded-3xl bg-white shadow-[0_14px_40px_-16px_rgba(46,204,113,0.55)] ring-2 ring-leaf/50"
    >
      <div className="flex items-center gap-2 bg-gradient-to-r from-[#1f7a3a] to-[#3eb35f] px-5 py-3 text-white">
        <Droplet className="h-4 w-4" />
        <p className="font-display text-base font-bold">Time to test your sugar again</p>
      </div>

      <div className="p-5">
        <MealLine
          name={name}
          sub={<>You started eating at {timeLabel(test.mealTime)}, about 2 hours ago.</>}
          onBlue={false}
        />

        <div className="mt-4">
          <TwoTests before={beforeText} after="Now" afterActive tone="white" />
        </div>

        <label htmlFor="gf-after" className="mt-5 block text-sm font-semibold text-ink">
          Your sugar 2 hours after eating
        </label>
        {/* Shaped like the screen of a sugar meter, same as when the meal began. */}
        <div className="mt-2 rounded-3xl bg-gradient-to-b from-[#0B2E5C] to-[#124A8C] p-3 shadow-[0_16px_36px_-18px_rgba(11,46,92,0.8)]">
          <div className="relative">
            <input
            id="gf-after"
            value={typed}
            onChange={(e) => {
              setTyped(e.target.value);
              setProblem("");
            }}
            inputMode="decimal"
            autoComplete="off"
            placeholder=" "
                      className="meter-input w-full rounded-2xl bg-white/10 px-4 py-4 text-center font-display text-4xl font-bold tabular-nums tracking-wide text-white outline-none ring-2 ring-white/15 transition-colors focus:ring-white/60"
          />
            <span aria-hidden className="fake-caret" />
          </div>
        </div>
        {parsed && <p className="mt-2 text-center text-sm text-ink-soft">{echoLine(parsed)}</p>}
        {refer && (
          <p className="mt-3 rounded-2xl border border-verdict-red/50 bg-verdict-red/5 px-4 py-3 text-sm font-semibold text-ink">
            {refer}
          </p>
        )}
        {needConsent && (
          <label className="mt-3 flex cursor-pointer items-start gap-3 rounded-2xl border border-line bg-mist px-4 py-3">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              className="mt-0.5 h-5 w-5 shrink-0 accent-[var(--blue)]"
            />
            <span className="text-sm text-ink">
              Glufloat will keep your sugar test numbers on your account so you can show
              them to your doctor. Only you can see them.
              <strong className="mt-1 block font-semibold">Yes, save my sugar test numbers.</strong>
            </span>
          </label>
        )}
        {problem && <p className="mt-2 text-sm font-semibold text-verdict-red">{problem}</p>}

        <button
          onClick={save}
          disabled={busy || !parsed}
          className="mt-4 w-full rounded-full bg-leaf px-5 py-3.5 text-sm font-bold text-white shadow-[0_14px_30px_-12px_rgba(62,155,79,0.7)] transition-colors hover:bg-leaf-deep disabled:opacity-50 disabled:shadow-none"
        >
          {busy ? "Saving..." : "Save my test"}
        </button>
        <button
          onClick={() => {
            void trackUsage("meal_test_skipped");
            close();
          }}
          className="mt-1 w-full rounded-full py-3 text-sm font-semibold text-ink-soft transition-colors hover:text-ink"
        >
          Skip this time
        </button>
      </div>
    </section>
  );
}
