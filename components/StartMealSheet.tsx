"use client";

import { useEffect, useState } from "react";
import { Bell, Check, Droplet, Timer, X } from "lucide-react";
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
  { key: "half", label: "Less", aria: "Less than this size of" },
  { key: "normal", label: "This size", aria: "This size of" },
  { key: "large", label: "More", aria: "More than this size of" },
];

/**
 * "Save this meal": the start of a MEAL TEST (lib/mealResponse.ts).
 *
 * The co-founder dietitian's loop, in the order a person lives it: how much they
 * are eating, then a sugar test before they eat, then "Start my meal", and the
 * app takes it from there (the 2-hour check on the home screen, and a reminder on
 * the phone if they allow one).
 *
 * Three rules shape it:
 * - THE SIZE STARTS ON OURS. The app gives one size per food, the dietitian's.
 *   What the person records is what really happened, as that size, less, or
 *   more; recording it never offers a bigger size as advice.
 * - THE TEST BEFORE EATING IS THE ENCOURAGED PATH, NEVER A GATE. Typing a number
 *   turns the main button solid green; with no number it still starts the meal,
 *   because strips cost money and a meal without a test is still a meal.
 * - "I ALREADY ATE IT" is still one tap, exactly as "I ate this" always was.
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
  const [amounts, setAmounts] = useState<PortionSize[]>([]);
  const [eatingNow, setEatingNow] = useState(true);
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
    setAmounts(items.map((i) => i.portion));
    setEatingNow(true);
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

  const close = () => {
    if (!busy) onClose();
  };

  const logAlreadyEaten = async () => {
    setBusy(true);
    const id = await saveCheck(kind, label, verdict, undefined, { foodIds, sizes });
    setBusy(false);
    if (id === null) {
      setProblem("That did not save. Please check your internet and try again.");
      return;
    }
    onLogged(sizes);
    showToast("Saved");
    onClose();
  };

  const start = async () => {
    if (typed.trim() && !parsed) {
      setProblem("Type the number your meter showed, like 6.5 or 140.");
      return;
    }
    if (parsed && needConsent && !agreed) {
      setProblem("Tick the box to let GluFloat save your sugar test.");
      return;
    }
    setBusy(true);
    setProblem("");
    if (parsed && needConsent && agreed) await giveHealthConsent();
    const res = await startMealTest({ kind, label, verdict, foodIds, sizes, before: parsed });
    setBusy(false);
    if (!res) {
      setProblem("That did not save. Please check your internet and try again.");
      return;
    }
    onLogged(sizes);
    setStarted({ startedAt: res.startedAt, beforeMgdl: res.beforeMgdl });
    setPushState(
      pushSupported() && pushConfigured() && pushPermission() === "default" ? "offer" : "hidden",
    );
  };

  const turnOnPush = async () => {
    const r = await enablePush();
    setPushState(r.ok ? "on" : "failed");
  };

  return (
    <div
      className="fixed inset-0 z-[80] flex items-end justify-center bg-ink/50 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={close}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Save your meal"
        onClick={(e) => e.stopPropagation()}
        className="verdict-pop relative max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-white p-5 pb-8 shadow-2xl sm:rounded-3xl sm:pb-5"
      >
        <button
          onClick={close}
          aria-label="Close the save meal box"
          className="absolute right-4 top-4 rounded-full p-1 text-ink-soft/60 transition-colors hover:bg-mist hover:text-ink"
        >
          <X className="h-5 w-5" />
        </button>

        {started ? (
          <div>
            <p className="flex items-center gap-2 font-display text-lg font-bold text-ink">
              <Check className="h-6 w-6 shrink-0 text-leaf-deep" strokeWidth={3} />
              Your meal test has started
            </p>
            <p className="mt-2 text-sm text-ink">Enjoy your meal.</p>
            <div className="mt-4 rounded-2xl bg-brand/5 px-4 py-3 ring-1 ring-brand/15">
              <p className="flex items-center gap-2 text-sm font-bold text-brand">
                <Timer className="h-4 w-4" /> Test your sugar again at{" "}
                {timeLabel(dueAt(started.startedAt).toISOString())}
              </p>
              <p className="mt-1 text-sm text-ink-soft">
                That is 2 hours after you started eating. GluFloat will ask you for
                it on the home screen.
              </p>
              {started.beforeMgdl !== null ? (
                <p className="mt-2 text-sm font-semibold text-ink">
                  Before eating: {formatBoth(started.beforeMgdl)}
                </p>
              ) : (
                <p className="mt-2 text-sm text-ink-soft">
                  No test before this meal. Your 2-hour test is still worth saving.
                </p>
              )}
            </div>

            {pushState === "offer" && (
              <div className="mt-3 rounded-2xl border border-line px-4 py-3">
                <p className="flex items-center gap-2 text-sm font-semibold text-ink">
                  <Bell className="h-4 w-4 text-brand" /> Get a reminder on this phone too?
                </p>
                <p className="mt-1 text-xs text-ink-soft">
                  On an iPhone, add GluFloat to your home screen first.
                </p>
                <button
                  onClick={turnOnPush}
                  className="mt-2 rounded-full bg-brand px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-brand-deep"
                >
                  Yes, remind me
                </button>
              </div>
            )}
            {pushState === "on" && (
              <p className="mt-3 text-sm font-semibold text-leaf-deep">
                Done. This phone will remind you at 2 hours.
              </p>
            )}
            {pushState === "failed" && (
              <p className="mt-3 text-sm text-ink-soft">
                This phone could not turn reminders on. GluFloat will still ask you
                on the home screen.
              </p>
            )}

            <button
              onClick={onClose}
              className="mt-5 w-full rounded-full bg-brand px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-brand-deep"
            >
              Done
            </button>
          </div>
        ) : (
          <div>
            <p className="font-display text-lg font-bold text-ink">Save this meal</p>

            <p className="mt-4 font-display text-base font-semibold text-ink">
              How much are you eating?
            </p>
            <p className="text-xs text-ink-soft">
              We start you on the GluFloat size. Change it only if your plate is different.
            </p>
            <div className="mt-2 space-y-3">
              {items.map((it, i) => {
                const name = cleanFoodName(it.food.name);
                const size = it.grams ? `About ${it.grams}g, today's bigger serving.` : firstSentence(it.food.portionGuidance);
                return (
                  <div key={it.food.id} className="rounded-2xl bg-mist/70 px-3 py-3 ring-1 ring-ink/[0.04]">
                    <p className="text-sm font-bold text-ink">{name}</p>
                    {size && <p className="text-xs text-ink-soft">GluFloat size: {size}</p>}
                    <div className="mt-2 flex gap-1.5">
                      {AMOUNTS.map((a) => {
                        const active = (amounts[i] ?? it.portion) === a.key;
                        return (
                          <button
                            key={a.key}
                            onClick={() =>
                              setAmounts((cur) => {
                                const next = [...cur];
                                next[i] = a.key;
                                return next;
                              })
                            }
                            aria-pressed={active}
                            aria-label={`${a.aria} ${name}`}
                            className={`flex-1 rounded-full px-2 py-1.5 text-xs font-bold transition-colors ${
                              active ? "bg-brand text-white" : "bg-white text-ink ring-1 ring-line hover:ring-brand/40"
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
              <p className="mt-2 text-xs font-semibold text-ink-soft">
                Saved as you ate it. Next time, try to keep to the GluFloat size.
              </p>
            )}

            <p className="mt-5 font-display text-base font-semibold text-ink">
              When are you eating it?
            </p>
            <div className="mt-2 flex flex-col gap-2">
              {[
                { now: true, title: "I am about to eat", sub: "Start a meal test: sugar before, and again in 2 hours" },
                { now: false, title: "I already ate it", sub: "Just save it to my food record" },
              ].map((o) => (
                <button
                  key={o.title}
                  onClick={() => {
                    setEatingNow(o.now);
                    setProblem("");
                  }}
                  aria-pressed={eatingNow === o.now}
                  className={`rounded-2xl border-2 px-4 py-2.5 text-left text-sm font-semibold transition-colors ${
                    eatingNow === o.now ? "border-brand bg-brand/5 text-ink" : "border-line bg-white text-ink hover:border-brand/40"
                  }`}
                >
                  {o.title}
                  <span className="block text-xs font-normal text-ink-soft">{o.sub}</span>
                </button>
              ))}
            </div>

            {eatingNow ? (
              <div className="mt-5 rounded-2xl bg-brand/5 p-4 ring-1 ring-brand/15">
                <p className="flex items-center gap-2 text-sm font-bold text-brand">
                  <Droplet className="h-4 w-4" /> Test your sugar before you eat
                </p>
                {pending ? (
                  <p className="mt-2 text-sm text-ink">
                    We will use the test you saved at {timeLabel(pending.takenAt)}:{" "}
                    <strong>{formatBoth(pending.mgdl)}</strong>.
                  </p>
                ) : (
                  <>
                    <p className="mt-1 text-sm text-ink-soft">
                      This is what lets your doctor see how much this meal moves your sugar.
                    </p>
                    <label htmlFor="gf-before" className="mt-3 block text-sm font-semibold text-ink">
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
                      <label className="mt-3 flex cursor-pointer items-start gap-3 rounded-2xl border border-line bg-white px-4 py-3">
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
              </div>
            ) : null}

            {problem && <p className="mt-3 text-sm font-semibold text-verdict-red">{problem}</p>}

            {eatingNow ? (
              <button
                onClick={start}
                disabled={busy}
                className={`mt-5 w-full rounded-full px-5 py-3 text-sm font-bold transition-colors disabled:opacity-60 ${
                  parsed || pending
                    ? "bg-leaf text-white hover:bg-leaf-deep"
                    : "border-2 border-leaf bg-white text-leaf-deep hover:bg-mint"
                }`}
              >
                {busy
                  ? "Saving..."
                  : parsed
                    ? "Save my test and start my meal"
                    : pending
                      ? "Start my meal"
                      : "Start my meal without a test"}
              </button>
            ) : (
              <button
                onClick={logAlreadyEaten}
                disabled={busy}
                className="mt-5 w-full rounded-full bg-leaf px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-leaf-deep disabled:opacity-60"
              >
                {busy ? "Saving..." : "Save this meal"}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
