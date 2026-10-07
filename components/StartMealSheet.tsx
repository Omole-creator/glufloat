"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, Bell, Check, Clock, Droplet, X } from "lucide-react";
import type { Food, PortionSize, Verdict } from "@/lib/types";
import { cleanFoodName } from "@/lib/foodName";
import { dangerLine, echoLine, formatBoth, parseReading } from "@/lib/glucose";
import { giveHealthConsent, hasHealthConsent } from "@/lib/glucoseLog";
import { saveCheck } from "@/lib/history";
import { dueAt, firstSentence, timeLabel } from "@/lib/mealResponse";
import { pendingBeforeTest, startMealTest } from "@/lib/mealTestLog";
import { enablePush, pushConfigured, pushPermission, pushSupported } from "@/lib/push";
import { showToast } from "./Toast";

export interface SheetItem {
  food: Food;
  portion: PortionSize;
  /** The blue card's bigger serving, in grams, when this plate came from it. */
  grams?: number;
}

const AMOUNTS: { key: PortionSize; label: string; aria: string }[] = [
  { key: "half", label: "Less", aria: "Less than the GluFloat size of" },
  { key: "normal", label: "Same", aria: "The same as the GluFloat size of" },
  { key: "large", label: "More", aria: "More than the GluFloat size of" },
];

type Step = "when" | "amount" | "test" | "done";

/**
 * Saving a meal, one small step at a time (rebuilt 2026-10-07, founder: the
 * first version "looks confusing and hard to understand", "7th grade English",
 * "everything should be simple"). Each step asks one thing:
 *
 *   1. When are you eating this?   about to eat / already ate
 *   2. How much is on your plate?  less / same / more than the GluFloat size
 *   3. Test your sugar first       only when about to eat; skippable
 *   4. Enjoy your meal             when to test again, and a phone reminder
 *
 * "I already ate it" stops after step 2 and saves, like the old one-tap log.
 *
 * Step 2 is what keeps the record honest: somebody who ate more than the size
 * GluFloat gave says so, and the meal is saved as eaten, so a sugar rise is not
 * later blamed on a food when the cause was the amount. It never offers a bigger
 * size as advice; the app still gives one size per food.
 *
 * The test before eating is the main button's path, but always skippable:
 * strips cost money, and a meal without a test is still a meal.
 */
export default function StartMealSheet({
  open,
  onClose,
  items,
  kind,
  label,
  verdict,
  onLogged,
}: {
  open: boolean;
  onClose: () => void;
  items: SheetItem[];
  kind: "single" | "meal";
  /** The stored label: food names, comma-joined for a meal. */
  label: string;
  verdict: Verdict;
  /** Called once the meal is saved, either way. */
  onLogged: (sizes: string[]) => void;
}) {
  const [step, setStep] = useState<Step>("when");
  const [eatingNow, setEatingNow] = useState(true);
  const [amounts, setAmounts] = useState<PortionSize[]>([]);
  const [typed, setTyped] = useState("");
  const [needConsent, setNeedConsent] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [pending, setPending] = useState<{ mgdl: number; takenAt: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState("");
  const [started, setStarted] = useState<{ startedAt: string; beforeMgdl: number | null } | null>(null);
  const [pushState, setPushState] = useState<"hidden" | "offer" | "on" | "failed">("hidden");

  // A fresh start every time it opens.
  useEffect(() => {
    if (!open) return;
    setStep("when");
    setEatingNow(true);
    setAmounts(items.map((i) => i.portion));
    setTyped("");
    setAgreed(false);
    setProblem("");
    setStarted(null);
    setBusy(false);
    void hasHealthConsent().then((ok) => setNeedConsent(!ok));
    void pendingBeforeTest().then(setPending);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!open) return null;

  const parsed = parseReading(typed);
  const refer = parsed ? dangerLine(parsed.mgdl) : null;
  const sizes = items.map((it, i) => {
    const a = amounts[i] ?? it.portion;
    return a === "normal" && it.grams ? `${it.grams}g` : a;
  });
  const foodIds = items.map((i) => i.food.id);
  const ateMore = amounts.some((a) => a === "large");

  const steps: Step[] = eatingNow ? ["when", "amount", "test"] : ["when", "amount"];
  const stepNo = steps.indexOf(step) + 1;

  const close = () => {
    if (!busy) onClose();
  };
  const back = () => {
    setProblem("");
    setStep(step === "test" ? "amount" : "when");
  };

  const saveEaten = async () => {
    setBusy(true);
    const id = await saveCheck(kind, label, verdict, undefined, { foodIds, sizes });
    setBusy(false);
    if (id === null) {
      setProblem("This did not save. Check your internet and try again.");
      return;
    }
    onLogged(sizes);
    showToast("Saved");
    onClose();
  };

  const start = async (withTest: boolean) => {
    const before = withTest ? parsed : null;
    if (withTest && !pending && !parsed) {
      setProblem("Type the number on your meter, like 6.5 or 140.");
      return;
    }
    if (before && needConsent && !agreed) {
      setProblem("Tick the box so GluFloat can save your sugar test.");
      return;
    }
    setBusy(true);
    setProblem("");
    if (before && needConsent && agreed) await giveHealthConsent();
    const res = await startMealTest({ kind, label, verdict, foodIds, sizes, before });
    setBusy(false);
    if (!res) {
      setProblem("This did not save. Check your internet and try again.");
      return;
    }
    onLogged(sizes);
    setStarted({ startedAt: res.startedAt, beforeMgdl: res.beforeMgdl });
    setPushState(pushSupported() && pushConfigured() && pushPermission() === "default" ? "offer" : "hidden");
    setStep("done");
  };

  const turnOnPush = async () => {
    const r = await enablePush();
    setPushState(r.ok ? "on" : "failed");
  };

  const choice = (active: boolean) =>
    `w-full rounded-2xl border-2 px-4 py-3.5 text-left transition-colors ${
      active ? "border-brand bg-brand/5" : "border-line bg-white hover:border-brand/40"
    }`;
  const primary =
    "flex w-full items-center justify-center gap-2 rounded-full bg-leaf px-5 py-3.5 text-sm font-bold text-white transition-colors hover:bg-leaf-deep disabled:opacity-50";

  return (
    <div
      className="fixed inset-0 z-[80] flex items-end justify-center bg-ink/50 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={close}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Save your meal"
        onClick={(e) => e.stopPropagation()}
        className="verdict-pop relative max-h-[92vh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-white px-5 pb-8 pt-4 shadow-2xl sm:rounded-3xl sm:pb-6"
      >
        {/* Top bar: back, where you are, close. */}
        <div className="flex h-10 items-center justify-between">
          {step !== "when" && step !== "done" ? (
            <button
              type="button"
              onClick={back}
              aria-label="Go back a step"
              className="-ml-1 flex h-10 w-10 items-center justify-center rounded-full text-ink-soft transition-colors hover:bg-mist hover:text-ink"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
          ) : (
            <span className="h-10 w-10" />
          )}
          {step !== "done" && (
            <div className="flex items-center gap-1.5" aria-label={`Step ${stepNo} of ${steps.length}`}>
              {steps.map((s, i) => (
                <span
                  key={s}
                  className={`h-1.5 rounded-full transition-all ${i < stepNo ? "w-6 bg-brand" : "w-1.5 bg-line"}`}
                />
              ))}
            </div>
          )}
          <button
            type="button"
            onClick={close}
            aria-label="Close the save meal box"
            className="-mr-1 flex h-10 w-10 items-center justify-center rounded-full text-ink-soft transition-colors hover:bg-mist hover:text-ink"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div key={step} className="step-in mt-2">
          {/* ---- 1. When ---- */}
          {step === "when" && (
            <>
              <h2 className="font-display text-xl font-bold text-ink">When are you eating this?</h2>
              <div className="mt-4 space-y-2.5">
                <button type="button" onClick={() => setEatingNow(true)} aria-pressed={eatingNow} className={choice(eatingNow)}>
                  <span className="block text-sm font-bold text-ink">I&apos;m about to eat it</span>
                  <span className="mt-0.5 block text-xs text-ink-soft">
                    We&apos;ll help you test your sugar before you eat and 2 hours after.
                  </span>
                </button>
                <button type="button" onClick={() => setEatingNow(false)} aria-pressed={!eatingNow} className={choice(!eatingNow)}>
                  <span className="block text-sm font-bold text-ink">I already ate it</span>
                  <span className="mt-0.5 block text-xs text-ink-soft">We&apos;ll add it to your food list.</span>
                </button>
              </div>
              <button type="button" onClick={() => setStep("amount")} className={`${primary} mt-6`}>
                Next
              </button>
            </>
          )}

          {/* ---- 2. How much ---- */}
          {step === "amount" && (
            <>
              <h2 className="font-display text-xl font-bold text-ink">How much is on your plate?</h2>
              <p className="mt-1 text-sm text-ink-soft">Compare it with the size GluFloat gave you.</p>
              <div className="mt-4 space-y-3">
                {items.map((it, i) => {
                  const name = cleanFoodName(it.food.name);
                  const size = it.grams
                    ? `About ${it.grams}g today.`
                    : firstSentence(it.food.portionGuidance);
                  const current = amounts[i] ?? it.portion;
                  return (
                    <div key={it.food.id} className="rounded-2xl bg-mist/70 p-3.5">
                      <p className="text-sm font-bold text-ink">{name}</p>
                      {size && <p className="mt-0.5 text-xs text-ink-soft">GluFloat size: {size}</p>}
                      <div className="mt-2.5 grid grid-cols-3 gap-1 rounded-full bg-white p-1 ring-1 ring-line">
                        {AMOUNTS.map((a) => {
                          const active = current === a.key;
                          return (
                            <button
                              key={a.key}
                              type="button"
                              onClick={() =>
                                setAmounts((cur) => {
                                  const next = [...cur];
                                  next[i] = a.key;
                                  return next;
                                })
                              }
                              aria-pressed={active}
                              aria-label={`${a.aria} ${name}`}
                              className={`rounded-full py-2 text-xs font-bold transition-colors ${
                                active ? "bg-brand text-white" : "text-ink-soft hover:text-ink"
                              }`}
                            >
                              {a.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
              {ateMore && (
                <p className="mt-3 text-xs text-ink-soft">
                  Got it. We&apos;ll save what you ate. Next time, try to stick to the GluFloat size.
                </p>
              )}
              {problem && <p className="mt-3 text-sm font-semibold text-verdict-red">{problem}</p>}
              {eatingNow ? (
                <button type="button" onClick={() => setStep("test")} className={`${primary} mt-6`}>
                  Next
                </button>
              ) : (
                <button type="button" onClick={saveEaten} disabled={busy} className={`${primary} mt-6`}>
                  {busy ? "Saving..." : "Save"}
                </button>
              )}
            </>
          )}

          {/* ---- 3. Test before eating ---- */}
          {step === "test" && (
            <>
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand/10 text-brand">
                <Droplet className="h-5 w-5" />
              </span>
              <h2 className="mt-3 font-display text-xl font-bold text-ink">Test your sugar first</h2>
              <p className="mt-1 text-sm text-ink-soft">
                Do it before your first bite. Your doctor can then see how much this meal moves your sugar.
              </p>

              {pending ? (
                <p className="mt-4 rounded-2xl bg-mist/70 px-4 py-3 text-sm text-ink">
                  We&apos;ll use the test you saved at {timeLabel(pending.takenAt)}:{" "}
                  <strong>{formatBoth(pending.mgdl)}</strong>
                </p>
              ) : (
                <>
                  <label htmlFor="gf-before" className="mt-4 block text-sm font-semibold text-ink">
                    Your sugar before eating
                  </label>
                  <input
                    id="gf-before"
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
                  {parsed && needConsent && (
                    <label className="mt-3 flex cursor-pointer items-start gap-3 rounded-2xl border border-line px-4 py-3">
                      <input
                        type="checkbox"
                        checked={agreed}
                        onChange={(e) => setAgreed(e.target.checked)}
                        className="mt-0.5 h-5 w-5 shrink-0 accent-[var(--blue)]"
                      />
                      <span className="text-sm text-ink">
                        Glufloat will keep your sugar test numbers on your account so you can
                        show them to your doctor. Only you can see them.
                        <strong className="mt-1 block font-semibold">Yes, save my sugar test numbers.</strong>
                      </span>
                    </label>
                  )}
                </>
              )}

              {problem && <p className="mt-3 text-sm font-semibold text-verdict-red">{problem}</p>}

              <button
                type="button"
                onClick={() => start(true)}
                disabled={busy || (!pending && !parsed)}
                className={`${primary} mt-6`}
              >
                {busy ? "Saving..." : "Start my meal"}
              </button>
              <button
                type="button"
                onClick={() => start(false)}
                disabled={busy}
                className="mt-2 w-full rounded-full py-3 text-sm font-semibold text-ink-soft transition-colors hover:text-ink disabled:opacity-50"
              >
                Skip the test this time
              </button>
            </>
          )}

          {/* ---- 4. Done ---- */}
          {step === "done" && started && (
            <>
              <span className="green-burst flex h-12 w-12 items-center justify-center rounded-full bg-leaf text-white">
                <Check className="h-6 w-6" strokeWidth={3} />
              </span>
              <h2 className="mt-3 font-display text-xl font-bold text-ink">Enjoy your meal</h2>

              <div className="mt-4 rounded-2xl bg-brand/5 p-4 ring-1 ring-brand/15">
                <p className="flex items-center gap-2 text-sm font-bold text-ink">
                  <Clock className="h-4 w-4 text-brand" />
                  Test again at {timeLabel(dueAt(started.startedAt).toISOString())}
                </p>
                <p className="mt-1 text-sm text-ink-soft">
                  That&apos;s 2 hours from now. We&apos;ll remind you on the home screen.
                </p>
                <p className="mt-3 border-t border-brand/10 pt-3 text-sm text-ink">
                  {started.beforeMgdl !== null ? (
                    <>
                      Before eating: <strong>{formatBoth(started.beforeMgdl)}</strong>
                    </>
                  ) : (
                    "No test before this meal. Your 2-hour test still helps."
                  )}
                </p>
              </div>

              {pushState === "offer" && (
                <button
                  type="button"
                  onClick={turnOnPush}
                  className="mt-3 flex w-full items-center justify-center gap-2 rounded-full border-2 border-line py-3 text-sm font-bold text-ink transition-colors hover:border-brand"
                >
                  <Bell className="h-4 w-4 text-brand" /> Remind me on this phone too
                </button>
              )}
              {pushState === "offer" && (
                <p className="mt-1.5 text-center text-xs text-ink-soft">
                  On an iPhone, add GluFloat to your home screen first.
                </p>
              )}
              {pushState === "on" && (
                <p className="mt-3 text-center text-sm font-semibold text-leaf-deep">
                  Done. This phone will remind you.
                </p>
              )}
              {pushState === "failed" && (
                <p className="mt-3 text-center text-sm text-ink-soft">
                  This phone could not turn on reminders. We&apos;ll still remind you on the home screen.
                </p>
              )}

              <button type="button" onClick={onClose} className={`${primary} mt-6`}>
                Done
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
