"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, Droplet, Timer, X } from "lucide-react";
import { dangerLine, echoLine, formatBoth, parseReading } from "@/lib/glucose";
import { READINGS_CHANGED, giveHealthConsent, hasHealthConsent } from "@/lib/glucoseLog";
import { INTAKE_CHANGED } from "@/lib/history";
import { displayLabel } from "@/lib/foodName";
import {
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

/**
 * The 2-hour check of a MEAL TEST, at the top of the home screen.
 *
 * Three faces, one card: the meal is running ("test again at 3:00pm"), the test
 * is due (type the number), and the result ("Meal test complete": before, after,
 * change). It reads the database, so a test started on one phone is finished on
 * another. It shows nothing at all when there is no meal test today.
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

  // ---- done: the result ----------------------------------------------------
  if (test.after) {
    return (
      <section
        id="meal-test"
        aria-label="Meal test result"
        className="relative scroll-mt-24 rounded-3xl bg-white p-5 shadow-[0_4px_24px_-12px_rgba(12,42,71,0.22)] ring-1 ring-leaf/30"
      >
        <button
          onClick={close}
          aria-label="Close the meal test result"
          className="absolute right-3 top-3 text-ink-soft/50 transition-colors hover:text-ink"
        >
          <X className="h-4 w-4" />
        </button>
        <p className="flex items-center gap-2 font-display text-lg font-bold text-ink">
          <Check className="h-5 w-5 shrink-0 text-leaf-deep" strokeWidth={3} />
          {test.before ? "Meal test complete" : "2-hour test saved"}
        </p>
        <p className="mt-1 text-sm font-semibold text-ink">{name}</p>
        <p className="text-xs text-ink-soft">
          Started {timeLabel(test.mealTime)} · Record {mealTestNumber(meal.id)}
        </p>

        <dl className="mt-4 divide-y divide-line rounded-2xl bg-mist/70 text-sm ring-1 ring-ink/[0.04]">
          <div className="flex items-center justify-between px-4 py-2.5">
            <dt className="text-ink-soft">Before eating</dt>
            <dd className="font-semibold text-ink">{test.before ? formatBoth(test.before.mgdl) : "No test"}</dd>
          </div>
          <div className="flex items-center justify-between px-4 py-2.5">
            <dt className="text-ink-soft">
              {test.minutesAfter !== null ? `${minutesLabel(test.minutesAfter)} after` : "After eating"}
            </dt>
            <dd className="font-semibold text-ink">{formatBoth(test.after.mgdl)}</dd>
          </div>
          {test.change !== null && (
            <div className="flex items-center justify-between px-4 py-2.5">
              <dt className="text-ink-soft">Change</dt>
              <dd className="font-display text-base font-bold text-ink">{formatChange(test.change)}</dd>
            </div>
          )}
        </dl>

        <p className="mt-3 text-sm text-ink-soft">
          {test.before
            ? "Saved to your meal and sugar record."
            : "Saved to your meal and sugar record. Next time, test before you eat too, so your doctor can see the change."}
        </p>
        {dangerLine(test.after.mgdl) && (
          <p className="mt-3 rounded-2xl border border-verdict-red/50 bg-verdict-red/5 px-4 py-3 text-sm font-semibold text-ink">
            {dangerLine(test.after.mgdl)}
          </p>
        )}
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            onClick={onOpenReport}
            className="rounded-full bg-brand px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-brand-deep"
          >
            Share with my doctor
          </button>
          <button
            onClick={close}
            className="rounded-full border-2 border-line bg-white px-5 py-2.5 text-sm font-bold text-ink transition-colors hover:border-brand"
          >
            Done
          </button>
        </div>
      </section>
    );
  }

  const state = dueState(test.mealTime, now);
  if (state === "over") return null;

  const dueTime = timeLabel(dueAt(test.mealTime).toISOString());
  const beforeLine = test.before ? (
    <p className="mt-2 text-sm text-ink">
      Before eating: <strong>{formatBoth(test.before.mgdl)}</strong>
    </p>
  ) : null;

  // ---- running: not yet time ---------------------------------------------
  if (state === "waiting") {
    return (
      <section
        id="meal-test"
        aria-label="Meal test running"
        className="relative scroll-mt-24 rounded-3xl bg-white p-5 shadow-[0_4px_24px_-12px_rgba(12,42,71,0.22)] ring-1 ring-brand/20"
      >
        <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-brand">
          <Timer className="h-4 w-4" /> Meal test running
        </p>
        <p className="mt-1 font-display text-base font-bold text-ink">{name}</p>
        <p className="mt-1 text-sm text-ink">
          Test your sugar again at <strong>{dueTime}</strong>. That is in about{" "}
          {wait(minutesToDue(test.mealTime, now))}.
        </p>
        {beforeLine}
        <button
          onClick={close}
          className="mt-3 text-xs font-semibold text-ink-soft underline-offset-2 hover:underline"
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
      setProblem("Type the number your meter showed, like 6.5 or 140.");
      return;
    }
    if (needConsent && !agreed) {
      setProblem("Tick the box to let GluFloat save your sugar test.");
      return;
    }
    setBusy(true);
    setProblem("");
    if (needConsent && agreed) await giveHealthConsent();
    const saved = await saveAfterTest(meal.id, parsed);
    setBusy(false);
    if (!saved) {
      setProblem("That did not save. Please check your internet and try again.");
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
      className="relative scroll-mt-24 rounded-3xl bg-white p-5 shadow-[0_8px_30px_-12px_rgba(46,204,113,0.45)] ring-2 ring-leaf/50"
    >
      <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-leaf-deep">
        <Droplet className="h-4 w-4" /> Time for your 2-hour sugar test
      </p>
      <p className="mt-1 font-display text-base font-bold text-ink">{name}</p>
      <p className="text-xs text-ink-soft">You started eating at {timeLabel(test.mealTime)}.</p>
      {beforeLine}

      <label htmlFor="gf-after" className="mt-4 block text-sm font-semibold text-ink">
        Your sugar 2 hours after eating
      </label>
      <input
        id="gf-after"
        value={typed}
        onChange={(e) => {
          setTyped(e.target.value);
          setProblem("");
        }}
        inputMode="decimal"
        autoComplete="off"
        className="mt-1.5 w-full rounded-2xl border-2 border-line bg-white px-4 py-3 text-lg font-semibold text-ink outline-none transition-colors focus:border-brand"
      />
      {parsed && <p className="mt-2 text-sm text-ink-soft">{echoLine(parsed)}</p>}
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

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          onClick={save}
          disabled={busy || !parsed}
          className="rounded-full bg-leaf px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-leaf-deep disabled:opacity-50"
        >
          {busy ? "Saving..." : "Save my 2-hour test"}
        </button>
        <button
          onClick={() => {
            void trackUsage("meal_test_skipped");
            close();
          }}
          className="rounded-full border-2 border-line bg-white px-5 py-3 text-sm font-bold text-ink transition-colors hover:border-brand"
        >
          I will not test this time
        </button>
      </div>
    </section>
  );
}
