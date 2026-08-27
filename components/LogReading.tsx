"use client";

import { useEffect, useState } from "react";
import { Check, ChevronRight, Droplet, X } from "lucide-react";
import {
  BAD_NUMBER,
  type ParsedReading,
  dangerLine,
  echoLine,
  parseReading,
} from "@/lib/glucose";
import {
  ADD_READING_FOR,
  type AskedMeal,
  giveHealthConsent,
  hasHealthConsent,
  saveReading,
} from "@/lib/glucoseLog";
import { recentChecks } from "@/lib/history";
import { displayLabel } from "@/lib/foodName";
import { localDayKey } from "@/lib/mealtime";
import { trackUsage } from "@/lib/usage";
import { showToast } from "@/components/Toast";

/** How many recent meals to offer. Enough to find the right one, few enough to read. */
const OFFER = 3;

/**
 * The clock time in Nigeria, so two meals on the same day can be told apart.
 * WAT is a fixed hour ahead of UTC, and the whole app reads it that way rather
 * than trusting the phone's own timezone.
 */
function whenLabel(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const wat = new Date(d.getTime() + 60 * 60 * 1000);
  const h24 = wat.getUTCHours();
  const m = String(wat.getUTCMinutes()).padStart(2, "0");
  const h = h24 % 12 === 0 ? 12 : h24 % 12;
  const time = `${h}:${m}${h24 < 12 ? "am" : "pm"}`;
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
  if (localDayKey(d) === localDayKey()) return time;
  if (localDayKey(d) === localDayKey(yesterday)) return `yesterday, ${time}`;
  return `${wat.getUTCDate()}/${wat.getUTCMonth() + 1}, ${time}`;
}

/**
 * "I have a sugar reading."
 *
 * The reading comes FIRST and the meal second, and that order is the whole
 * design. Test strips cost money, so most people here test once or twice a week,
 * not after every meal. Somebody in that position opens the app already holding a
 * number, and asking them to find a meal and then add a reading to it is asking
 * for the wrong thing in the wrong order.
 *
 * For the same reason the meal is OPTIONAL. A fasting number and a reading taken
 * at no particular time are both real and both worth having on the doctor report,
 * so "Not after a meal" is an ordinary answer and not a failure.
 *
 * What this card must never do: grade the number. There is no colour on it, no
 * "that is high", no reassurance either. It says the number back in both units so
 * a wrong guess at the unit is visible, and when a reading is far out it hands
 * the person to their doctor and stops. See lib/glucose.ts for why.
 */
export default function LogReading() {
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const [meals, setMeals] = useState<AskedMeal[]>([]);
  const [mealId, setMealId] = useState<number | null>(null);
  const [needConsent, setNeedConsent] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState<ParsedReading | null>(null);
  const [problem, setProblem] = useState("");

  // The recent meals to offer, and whether we still have to ask about keeping
  // readings at all. Both only matter once the card is open.
  useEffect(() => {
    if (!open) return;
    void recentChecks(OFFER).then((recent) =>
      // Keep a meal the doctor report asked us about, even when it is older than
      // the few we fetch. It is the one they picked.
      setMeals((cur) => [
        ...cur.filter((c) => !recent.some((r) => r.id === c.id)),
        ...recent,
      ]),
    );
    void hasHealthConsent().then((ok) => setNeedConsent(!ok));
  }, [open]);

  // "Add your reading" on a row of the doctor report.
  useEffect(() => {
    const onAsk = (e: Event) => {
      const meal = (e as CustomEvent<AskedMeal>).detail;
      if (!meal) return;
      setSaved(null);
      setProblem("");
      setTyped("");
      setMeals((cur) => [meal, ...cur.filter((c) => c.id !== meal.id)]);
      setMealId(meal.id);
      setOpen(true);
      setTimeout(() => {
        document
          .getElementById("log-reading")
          ?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 60);
    };
    window.addEventListener(ADD_READING_FOR, onAsk);
    return () => window.removeEventListener(ADD_READING_FOR, onAsk);
  }, []);

  const parsed = parseReading(typed);
  const blocked = !parsed || (needConsent && !agreed);

  const reset = () => {
    setTyped("");
    setMealId(null);
    setProblem("");
    setSaved(null);
  };

  const close = () => {
    setOpen(false);
    reset();
  };

  const save = async () => {
    if (!parsed) {
      setProblem(BAD_NUMBER);
      return;
    }
    setBusy(true);
    setProblem("");
    if (needConsent && agreed) await giveHealthConsent();
    const row = await saveReading(
      parsed.valueRaw,
      parsed.unit,
      parsed.mgdl,
      mealId,
    );
    setBusy(false);
    if (!row) {
      setProblem("That did not save. Please check your internet and try again.");
      return;
    }
    void trackUsage("reading_logged");
    setNeedConsent(false);
    setSaved(parsed);
    showToast("Saved");
  };

  // Closed: a filled green button, not a white card. As a card it read as a
  // heading and people did not know it could be tapped. Green is the action
  // colour everywhere else in here ("I ate this"), and the arrow says it opens.
  if (!open) {
    return (
      <button
        id="log-reading"
        onClick={() => setOpen(true)}
        className="flex w-full scroll-mt-24 items-center gap-3 rounded-2xl bg-leaf px-4 py-4 text-left text-white shadow-[0_8px_20px_-8px_rgba(46,204,113,0.55)] transition-transform hover:-translate-y-0.5"
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/20">
          <Droplet className="h-4.5 w-4.5" />
        </span>
        <span className="flex-1">
          <span className="block text-[15px] font-bold">I tested my sugar</span>
          <span className="block text-xs font-medium text-white/80">
            Tap to save the number, ready for your doctor
          </span>
        </span>
        <ChevronRight className="h-5 w-5 shrink-0 text-white/80" strokeWidth={2.5} />
      </button>
    );
  }

  // After a save. The number is shown back with no verdict on it, and the
  // referral line stays visible if there is one, because that is the part they
  // need to act on.
  if (saved) {
    const refer = dangerLine(saved.mgdl);
    return (
      <div
        id="log-reading"
        className="scroll-mt-24 rounded-3xl bg-white p-5 shadow-[0_4px_24px_-12px_rgba(12,42,71,0.22)] ring-1 ring-ink/[0.04]"
      >
        <p className="flex items-center gap-2 text-sm font-semibold text-ink">
          <Check className="h-5 w-5 shrink-0 text-leaf-deep" strokeWidth={3} />
          Saved to your food record.
        </p>
        <p className="mt-1 text-sm text-ink-soft">{echoLine(saved)}</p>
        {refer && (
          <p className="mt-3 rounded-2xl border border-verdict-red/50 bg-verdict-red/5 px-4 py-3 text-sm font-semibold text-ink">
            {refer}
          </p>
        )}
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            onClick={reset}
            className="rounded-full border-2 border-line bg-white px-5 py-2.5 text-sm font-bold text-ink transition-colors hover:border-brand"
          >
            Add another test
          </button>
          <button
            onClick={close}
            className="rounded-full bg-brand px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-brand-deep"
          >
            Done
          </button>
        </div>
      </div>
    );
  }

  const refer = parsed ? dangerLine(parsed.mgdl) : null;

  return (
    <div
      id="log-reading"
      className="relative scroll-mt-24 rounded-3xl bg-white p-5 shadow-[0_4px_24px_-12px_rgba(12,42,71,0.22)] ring-1 ring-ink/[0.04]"
    >
      <button
        onClick={close}
        aria-label="Close the sugar test box"
        className="absolute right-3 top-3 text-ink-soft/50 transition-colors hover:text-ink"
      >
        <X className="h-4 w-4" />
      </button>

      <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-brand">
        <Droplet className="h-4 w-4" /> Your sugar test
      </p>

      <label
        htmlFor="gf-reading"
        className="mt-2 block font-display text-base font-semibold text-ink"
      >
        Type the number your meter showed
      </label>
      <input
        id="gf-reading"
        value={typed}
        onChange={(e) => {
          setTyped(e.target.value);
          setProblem("");
        }}
        inputMode="decimal"
        autoComplete="off"
        className="mt-2 w-full rounded-2xl border-2 border-line bg-white px-4 py-3 text-lg font-semibold text-ink outline-none transition-colors focus:border-brand"
      />
      {/* Both units, so a wrong guess at the unit is visible while they can
          still fix it. Nothing is said before they type: the label above already
          tells them what to do, and a second line only crowds it. */}
      {parsed && (
        <p className="mt-2 text-sm text-ink-soft">{echoLine(parsed)}</p>
      )}
      {problem && (
        <p className="mt-2 text-sm font-semibold text-verdict-red">{problem}</p>
      )}

      {refer && (
        <p className="mt-3 rounded-2xl border border-verdict-red/50 bg-verdict-red/5 px-4 py-3 text-sm font-semibold text-ink">
          {refer}
        </p>
      )}

      {meals.length > 0 && (
        <>
          <p className="mt-5 font-display text-base font-semibold text-ink">
            Which meal gave you this number after 2 or more hours?
          </p>
          <div className="mt-2 flex flex-col gap-2">
            {meals.map((m) => (
              <button
                key={m.id}
                onClick={() => setMealId(m.id)}
                aria-pressed={mealId === m.id}
                className={`rounded-2xl border-2 px-4 py-2.5 text-left text-sm font-semibold transition-colors ${
                  mealId === m.id
                    ? "border-brand bg-brand/5 text-ink"
                    : "border-line bg-white text-ink hover:border-brand/40"
                }`}
              >
                {displayLabel(m.label)}
                <span className="block text-xs font-normal text-ink-soft">
                  {whenLabel(m.checkedAt)}
                </span>
              </button>
            ))}
            {/* An ordinary answer, not a failure. See the note at the top. */}
            <button
              onClick={() => setMealId(null)}
              aria-pressed={mealId === null}
              className={`rounded-2xl border-2 px-4 py-2.5 text-left text-sm font-semibold transition-colors ${
                mealId === null
                  ? "border-brand bg-brand/5 text-ink"
                  : "border-line bg-white text-ink hover:border-brand/40"
              }`}
            >
              None of these meals
              <span className="block text-xs font-normal text-ink-soft">
                It is my first test today
              </span>
            </button>
          </div>
        </>
      )}

      {needConsent && (
        <label className="mt-5 flex cursor-pointer items-start gap-3 rounded-2xl border border-line bg-mist px-4 py-3">
          <input
            type="checkbox"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            className="mt-0.5 h-5 w-5 shrink-0 accent-[var(--blue)]"
          />
          <span className="text-sm text-ink">
            Glufloat will keep your sugar test numbers on your account so you can
            show them to your doctor. Only you can see them.
            <strong className="mt-1 block font-semibold">
              Yes, save my sugar test numbers.
            </strong>
          </span>
        </label>
      )}

      <button
        onClick={save}
        disabled={busy || blocked}
        className="mt-5 w-full rounded-full bg-brand px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-brand-deep disabled:opacity-50"
      >
        {busy ? "Saving..." : "Save this test"}
      </button>
    </div>
  );
}
