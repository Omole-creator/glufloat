"use client";

import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { ArrowLeft, ArrowRight, Bell, Check, Clock, Droplet, UtensilsCrossed, X } from "lucide-react";
import type { Food, PortionSize, Verdict } from "@/lib/types";
import { cleanFoodName } from "@/lib/foodName";
import { dangerLine, echoLine, formatBoth, parseReading } from "@/lib/glucose";
import { giveHealthConsent, hasHealthConsent } from "@/lib/glucoseLog";
import { saveCheck } from "@/lib/history";
import { LESS_AMOUNTS, MORE_AMOUNTS, dueAt, firstSentence, sizeFactor, timeLabel } from "@/lib/mealResponse";
import { pendingBeforeTest, startMealTest } from "@/lib/mealTestLog";
import { enablePush, pushConfigured, pushPermission, pushSupported } from "@/lib/push";
import { showToast } from "./Toast";
import { MeasureChips } from "./MeasurePhoto";

export interface SheetItem {
  food: Food;
  portion: PortionSize;
  /** The blue card's bigger serving, in grams, when this plate came from it. */
  grams?: number;
  /** That bigger serving's calories. Without it, the food's own calories. */
  calories?: number;
}

const AMOUNTS: { key: PortionSize; label: string; aria: string }[] = [
  { key: "half", label: "Less", aria: "Less than the right size of" },
  { key: "normal", label: "Same", aria: "The same as the right size of" },
  { key: "large", label: "More", aria: "More than the right size of" },
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
  // After "Less" or "More": how much less or more (lib/mealResponse.ts).
  const [howMuch, setHowMuch] = useState<(string | null)[]>([]);
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
    setHowMuch(items.map(() => null));
    setTyped("");
    setAgreed(false);
    setProblem("");
    setStarted(null);
    setBusy(false);
    void hasHealthConsent().then((ok) => setNeedConsent(!ok));
    void pendingBeforeTest().then(setPending);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // While it is open, the page underneath stays still and Escape closes it.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !busy) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose, busy]);

  if (!open) return null;

  const parsed = parseReading(typed);
  const refer = parsed ? dangerLine(parsed.mgdl) : null;
  const sizes = items.map((it, i) => {
    const a = amounts[i] ?? it.portion;
    if (a === "normal") return it.grams ? `${it.grams}g` : a;
    return howMuch[i] ?? a;
  });
  // Calories as really eaten: today's size of each food, times how much
  // less or more. Saved on the meal so "calories left today" is true.
  const calories = Math.round(
    items.reduce((sum, it, i) => sum + (it.calories ?? it.food.calories ?? 0) * sizeFactor(sizes[i]), 0),
  );
  // A "Less" or "More" with no "how much" picked yet.
  const missingHowMuch = items.findIndex((it, i) => {
    const a = amounts[i] ?? it.portion;
    return a !== "normal" && !howMuch[i];
  });
  const askHowMuch = () => {
    if (missingHowMuch === -1) return true;
    const a = amounts[missingHowMuch] ?? items[missingHowMuch].portion;
    const name = cleanFoodName(items[missingHowMuch].food.name);
    setProblem(`Tap how much ${a === "large" ? "more" : "less"} ${name} you ate.`);
    return false;
  };
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
    if (!askHowMuch()) return;
    setBusy(true);
    const id = await saveCheck(kind, label, verdict, calories, { foodIds, sizes });
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
    const res = await startMealTest({ kind, label, verdict, foodIds, sizes, calories, before });
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
    `flex w-full items-start gap-3 rounded-2xl border-2 px-4 py-4 text-left transition-all ${
      active
        ? "border-brand bg-brand/5 shadow-[0_10px_24px_-14px_rgba(27,95,170,0.6)]"
        : "border-line bg-white hover:border-brand/40"
    }`;
  const radio = (active: boolean) => (
    <span
      aria-hidden
      className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${
        active ? "border-brand bg-brand" : "border-line bg-white"
      }`}
    >
      {active && <Check className="h-3 w-3 text-white" strokeWidth={3.5} />}
    </span>
  );
  const primary =
    "flex w-full items-center justify-center gap-2 rounded-full bg-leaf px-5 py-4 text-sm font-bold text-white shadow-[0_14px_30px_-12px_rgba(62,155,79,0.7)] transition-colors hover:bg-leaf-deep disabled:opacity-50 disabled:shadow-none";

  // Each step's question lives in the coloured band at the top, so the white
  // part below holds only what you tap.
  const TITLE: Record<Step, string> = {
    when: "When are you eating this?",
    amount: "How much is on your plate?",
    test: "Test your sugar first",
    done: "Enjoy your meal",
  };
  const done = step === "done";
  const names = items.map((it) => cleanFoodName(it.food.name));

  // The one button for the step, pinned to the bottom of the screen.
  let footer: ReactNode = null;
  if (step === "when") {
    footer = (
      <button type="button" onClick={() => setStep("amount")} className={primary}>
        Next <ArrowRight className="h-4 w-4" />
      </button>
    );
  } else if (step === "amount") {
    footer = eatingNow ? (
      <button type="button" onClick={() => askHowMuch() && setStep("test")} className={primary}>
        Next <ArrowRight className="h-4 w-4" />
      </button>
    ) : (
      <button type="button" onClick={saveEaten} disabled={busy} className={primary}>
        {busy ? "Saving..." : "Save"}
      </button>
    );
  } else if (step === "test") {
    footer = (
      <>
        <button
          type="button"
          onClick={() => start(true)}
          disabled={busy || (!pending && !parsed)}
          className={primary}
        >
          {busy ? "Saving..." : "Start my meal"}
        </button>
        <button
          type="button"
          onClick={() => start(false)}
          disabled={busy}
          className="mt-1 w-full rounded-full py-3 text-sm font-semibold text-ink-soft transition-colors hover:text-ink disabled:opacity-50"
        >
          Skip the test this time
        </button>
      </>
    );
  } else if (done && started) {
    footer = (
      <button type="button" onClick={onClose} className={primary}>
        Done
      </button>
    );
  }

  // Drawn straight onto <body>. Inside the answer card it sat under an
  // ancestor with a transform (the card's rise-in animation), which pins a
  // "fixed" box to that card instead of the screen: it showed squeezed into
  // the middle of the page instead of filling it.
  return createPortal(
    <div className="fixed inset-0 z-[80] flex justify-end">
      <div className="fade-in absolute inset-0 bg-ink/50 backdrop-blur-sm" onClick={close} aria-hidden />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Save your meal"
        className="sheet-in relative flex h-[100dvh] w-full flex-col overflow-hidden bg-mist shadow-2xl sm:max-w-md"
      >
        {/* ---- the coloured band: where you are, and the question ---- */}
        <header
          className={`relative shrink-0 overflow-hidden px-5 pb-8 pt-3 text-white ${
            done
              ? "bg-gradient-to-br from-[#1f7a3a] via-[#2e9b4f] to-[#3eb35f]"
              : "bg-gradient-to-br from-[#0B2E5C] via-[#124A8C] to-[#1B5FAA]"
          }`}
        >
          <div aria-hidden className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-white/10 blur-2xl" />
          <div className="relative flex h-11 items-center justify-between">
            {step !== "when" && !done ? (
              <button
                type="button"
                onClick={back}
                aria-label="Go back a step"
                className="-ml-2 flex h-11 w-11 items-center justify-center rounded-full text-white/80 transition-colors hover:bg-white/10 hover:text-white"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
            ) : (
              <span className="h-11 w-11" />
            )}
            {!done && (
              <span className="text-xs font-bold uppercase tracking-widest text-white/70">
                Step {stepNo} of {steps.length}
              </span>
            )}
            <button
              type="button"
              onClick={close}
              aria-label="Close the save meal box"
              className="-mr-2 flex h-11 w-11 items-center justify-center rounded-full text-white/80 transition-colors hover:bg-white/10 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {!done && (
            <div className="relative mt-2 flex gap-1.5" aria-hidden>
              {steps.map((s, i) => (
                <span
                  key={s}
                  className={`h-1.5 flex-1 rounded-full transition-colors duration-300 ${
                    i < stepNo ? "bg-white" : "bg-white/25"
                  }`}
                />
              ))}
            </div>
          )}

          <div key={`h-${step}`} className="step-in relative mt-5">
            {done ? (
              <span className="green-burst flex h-14 w-14 items-center justify-center rounded-full bg-white text-leaf-deep">
                <Check className="h-7 w-7" strokeWidth={3} />
              </span>
            ) : (
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/25">
                {step === "test" ? <Droplet className="h-6 w-6" /> : <UtensilsCrossed className="h-6 w-6" />}
              </span>
            )}
            <h2 className="mt-4 font-display text-2xl font-bold leading-tight">{TITLE[step]}</h2>
            {step === "amount" && (
              <p className="mt-1 text-sm text-white/80">Compare it with the right size shown below.</p>
            )}
            {step === "test" && (
              <p className="mt-1 text-sm text-white/80">
                Do it before your first bite. Your doctor can then see how much this meal moves your sugar.
              </p>
            )}
          </div>

          {/* What is being saved, always in view. */}
          {!done && (
            <div className="relative mt-4 flex flex-wrap gap-1.5">
              {names.map((n, i) => (
                <span
                  key={`${n}-${i}`}
                  className="rounded-full bg-white/15 px-3 py-1 text-xs font-semibold text-white ring-1 ring-white/20"
                >
                  {n}
                </span>
              ))}
            </div>
          )}
        </header>

        {/* ---- what you tap ---- */}
        <div className="relative -mt-4 flex-1 overflow-y-auto rounded-t-3xl bg-mist px-5 pb-6 pt-6">
          <div key={step} className="step-in">
            {/* ---- 1. When ---- */}
            {step === "when" && (
              <div className="space-y-3">
                <button type="button" onClick={() => setEatingNow(true)} aria-pressed={eatingNow} className={choice(eatingNow)}>
                  {radio(eatingNow)}
                  <span>
                    <span className="block text-sm font-bold text-ink">I&apos;m about to eat it</span>
                    <span className="mt-1 block text-xs leading-relaxed text-ink-soft">
                      Test and record your sugar before you eat, then 2 hours after eating.
                    </span>
                  </span>
                </button>
                <button type="button" onClick={() => setEatingNow(false)} aria-pressed={!eatingNow} className={choice(!eatingNow)}>
                  {radio(!eatingNow)}
                  <span>
                    <span className="block text-sm font-bold text-ink">I already ate it</span>
                    <span className="mt-1 block text-xs leading-relaxed text-ink-soft">
                      We&apos;ll add it to your food list.
                    </span>
                  </span>
                </button>
              </div>
            )}

            {/* ---- 2. How much ---- */}
            {step === "amount" && (
              <>
                <div className="space-y-3">
                  {items.map((it, i) => {
                    const name = cleanFoodName(it.food.name);
                    // A bigger blue-card serving arrives as a food copy whose
                    // portionGuidance is that serving in household words. Use
                    // them when they really are for those grams; a bare "163g"
                    // means nothing to someone with no scale.
                    const pg = it.food.portionGuidance;
                    const size = it.grams
                      ? pg.includes(`${it.grams}g`)
                        ? pg
                        : `About ${it.grams}g today.`
                      : firstSentence(pg);
                    const current = amounts[i] ?? it.portion;
                    return (
                      <div
                        key={it.food.id}
                        className="rounded-2xl bg-white p-4 shadow-[0_4px_20px_-12px_rgba(12,42,71,0.25)] ring-1 ring-ink/[0.05]"
                      >
                        <p className="text-sm font-bold text-ink">{name}</p>
                        {size && (
                          <p className="mt-1 text-xs leading-relaxed text-ink-soft">
                            <span className="font-semibold text-ink">Right size: </span>
                            {size}
                          </p>
                        )}
                        <MeasureChips text={size} forFood={name} className="mt-2" />
                        <div className="mt-3 grid grid-cols-3 gap-1 rounded-full bg-mist p-1">
                          {AMOUNTS.map((a) => {
                            const active = current === a.key;
                            return (
                              <button
                                key={a.key}
                                type="button"
                                onClick={() => {
                                  setProblem("");
                                  setAmounts((cur) => {
                                    const next = [...cur];
                                    next[i] = a.key;
                                    return next;
                                  });
                                  setHowMuch((cur) => {
                                    const next = [...cur];
                                    next[i] = null;
                                    return next;
                                  });
                                }}
                                aria-pressed={active}
                                aria-label={`${a.aria} ${name}`}
                                className={`rounded-full py-2.5 text-xs font-bold transition-all ${
                                  active ? "bg-brand text-white shadow-sm" : "text-ink-soft hover:text-ink"
                                }`}
                              >
                                {a.label}
                              </button>
                            );
                          })}
                        </div>
                        {current !== "normal" && (
                          <div className="mt-3 rounded-xl bg-brand/5 p-3">
                            <p className="text-xs font-semibold text-ink">
                              About how much {current === "large" ? "more" : "less"}?
                            </p>
                            <div className="mt-2 flex flex-wrap gap-1.5">
                              {(current === "large" ? MORE_AMOUNTS : LESS_AMOUNTS).map((h) => {
                                const on = howMuch[i] === h.key;
                                return (
                                  <button
                                    key={h.key}
                                    type="button"
                                    onClick={() => {
                                      setProblem("");
                                      setHowMuch((cur) => {
                                        const next = [...cur];
                                        next[i] = h.key;
                                        return next;
                                      });
                                    }}
                                    aria-pressed={on}
                                    aria-label={`${h.label} ${name}`}
                                    className={`rounded-full px-3 py-2 text-xs font-bold ring-1 transition-colors ${
                                      on ? "bg-brand text-white ring-brand" : "bg-white text-ink-soft ring-line hover:text-ink"
                                    }`}
                                  >
                                    {h.label}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
                {ateMore && (
                  <p className="mt-3 rounded-xl bg-white px-4 py-3 text-xs text-ink-soft ring-1 ring-line">
                    Got it. We&apos;ll save what you ate. Next time, keep to the right size.
                  </p>
                )}
              </>
            )}

            {/* ---- 3. Test before eating ---- */}
            {step === "test" &&
              (pending ? (
                <div className="rounded-2xl bg-white p-4 text-sm text-ink ring-1 ring-ink/[0.05]">
                  We&apos;ll use the test you saved at {timeLabel(pending.takenAt)}:{" "}
                  <strong>{formatBoth(pending.mgdl)}</strong>
                </div>
              ) : (
                <>
                  {/* Shaped like the screen of a sugar meter, so it is plain
                      which number goes here. */}
                  <label htmlFor="gf-before" className="block text-sm font-semibold text-ink">
                    Your sugar before eating
                  </label>
                  <div className="mt-2 rounded-3xl bg-gradient-to-b from-[#0B2E5C] to-[#124A8C] p-3 shadow-[0_16px_36px_-18px_rgba(11,46,92,0.8)]">
                    <input
                      id="gf-before"
                      value={typed}
                      onChange={(e) => {
                        setTyped(e.target.value);
                        setProblem("");
                      }}
                      inputMode="decimal"
                      autoComplete="off"
                      className="w-full rounded-2xl bg-white/10 px-4 py-4 text-center font-display text-4xl font-bold tabular-nums tracking-wide text-white outline-none ring-2 ring-white/15 transition-colors focus:ring-white/60"
                    />
                  </div>
                  {parsed && <p className="mt-2 text-center text-sm text-ink-soft">{echoLine(parsed)}</p>}
                  {refer && (
                    <p className="mt-3 rounded-2xl border border-verdict-red/50 bg-verdict-red/5 px-4 py-3 text-sm font-semibold text-ink">
                      {refer}
                    </p>
                  )}
                  {parsed && needConsent && (
                    <label className="mt-3 flex cursor-pointer items-start gap-3 rounded-2xl bg-white px-4 py-3 ring-1 ring-line">
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
              ))}

            {/* ---- 4. Done ---- */}
            {done && started && (
              <>
                <div className="rounded-3xl bg-white p-5 shadow-[0_8px_30px_-16px_rgba(12,42,71,0.35)] ring-1 ring-ink/[0.05]">
                  <p className="flex items-center gap-2 text-sm font-bold text-ink">
                    <Clock className="h-4 w-4 text-brand" />
                    Test again at {timeLabel(dueAt(started.startedAt).toISOString())}
                  </p>
                  <p className="mt-1 text-sm text-ink-soft">
                    That&apos;s 2 hours from now. We&apos;ll remind you on the home screen.
                  </p>
                  <p className="mt-4 border-t border-line pt-4 text-sm text-ink">
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
                    className="mt-3 flex w-full items-center justify-center gap-2 rounded-full border-2 border-line bg-white py-3 text-sm font-bold text-ink transition-colors hover:border-brand"
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
              </>
            )}

            {problem && <p className="mt-4 text-sm font-semibold text-verdict-red">{problem}</p>}
          </div>
        </div>

        {/* ---- the step's button, always under the thumb ---- */}
        {footer && (
          <div className="shrink-0 border-t border-line bg-white px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
