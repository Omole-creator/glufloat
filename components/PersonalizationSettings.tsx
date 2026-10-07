"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, Check, ChevronRight, UserRound } from "lucide-react";
import {
  GOALS,
  ACTIVITY_LEVELS,
  GOAL_LABEL,
  ACTIVITY_LABEL,
  type Goal,
  type ActivityLevel,
} from "@/lib/personalization";
import {
  bmr,
  tdee,
  calorieTarget,
  bmi,
  bmiCategory,
  BMI_CATEGORY_LABEL,
  CONDITIONS,
  CONDITION_LABEL,
  ACTIVITY_DESCRIPTION,
  type Sex,
  type Condition,
} from "@/lib/tdee";
import {
  readPersonalizationProfile,
  savePersonalizationProfile,
  MED_TYPE_OPTIONS,
  type MedTime,
  type MedType,
} from "@/lib/personalizationProfile";
import type { NamedMeal } from "@/lib/mealtime";
import { showToast } from "@/components/Toast";

// No longer asked as a question (founder's call, 2026-08-29: one less thing
// to answer) — everyone is planned for all 3 meals. normalizeMealPattern in
// lib/mealPattern.ts already treats an empty/full list as "eats all 3", so
// this is simply always saved as the full set now.
const MEALS: NamedMeal[] = ["breakfast", "lunch", "dinner"];

const SEX_LABEL: Record<Sex, string> = { male: "Male", female: "Female" };
const SEXES: Sex[] = ["male", "female"];

const MED_DOSE_OPTIONS: { value: number; label: string }[] = [
  { value: 0, label: "I don't take medication" },
  { value: 1, label: "Once" },
  { value: 2, label: "Twice" },
  { value: 3, label: "Three times" },
];

const MED_TIME_LABEL: Record<MedTime, string> = {
  morning: "Morning (8am–11am)",
  afternoon: "Afternoon (12pm–4pm)",
  evening: "Evening (5pm–9pm)",
};
const MED_TIMES: MedTime[] = ["morning", "afternoon", "evening"];

/**
 * A full-width, left-aligned option row, one choice per line (founder
 * instruction, 2026-08-29: never two side by side). Text stays the size it always
 * was (founder: do not increase the font size); the row itself is a tall,
 * easy target with a tick box or dot that shows the choice at a glance.
 */
function OptionRow({
  active,
  onClick,
  children,
  sub,
  multi = false,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  /** A second, quieter line (the activity levels' descriptions). */
  sub?: string;
  /** Square tick box for "select all that apply", round dot for one answer. */
  multi?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`flex w-full items-center gap-3.5 rounded-2xl px-4 py-3.5 text-left transition-all duration-200 ${
        active
          ? "bg-leaf text-white shadow-[0_10px_24px_-12px_rgba(46,204,113,0.9)]"
          : "bg-white/95 text-ink hover:bg-white"
      }`}
    >
      <span
        aria-hidden
        className={`flex h-6 w-6 shrink-0 items-center justify-center border-2 transition-colors ${
          multi ? "rounded-md" : "rounded-full"
        } ${active ? "border-white bg-white text-leaf-deep" : "border-ink/25 bg-white"}`}
      >
        {active && <Check className="h-3.5 w-3.5" strokeWidth={3.5} />}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold leading-snug">{children}</span>
        {sub && (
          <span className={`mt-0.5 block text-xs leading-snug ${active ? "text-white/90" : "text-ink-soft"}`}>
            {sub}
          </span>
        )}
      </span>
    </button>
  );
}

function NumberField({
  id,
  label,
  unit,
  value,
  onChange,
  placeholder,
  min,
  max,
}: {
  id: string;
  label: string;
  unit: string;
  value: number | null;
  onChange: (n: number | null) => void;
  placeholder: string;
  /** Matches the DB check constraint (health-profile-schema.sql) — clamped
   *  here too, so the calorie readout can never show a nonsense number from
   *  an out-of-range weight/height/age while typing. */
  min: number;
  max: number;
}) {
  return (
    <div>
      <label htmlFor={id} className="block text-xs font-semibold text-white/80">
        {label}
      </label>
      <div className="mt-1.5 flex items-center rounded-2xl bg-white pr-4 ring-2 ring-transparent transition focus-within:ring-leaf">
        <input
          id={id}
          type="number"
          inputMode="decimal"
          min={min}
          max={max}
          value={value ?? ""}
          onChange={(e) => {
            // Clamping every keystroke would trap a multi-digit number typed
            // from the low end (typing "70" clamps to the min the moment "7"
            // is on screen), so accept anything here and clamp on blur.
            const raw = e.target.value;
            onChange(raw === "" ? null : Number(raw));
          }}
          onBlur={() => {
            if (value != null && !Number.isNaN(value)) {
              onChange(Math.min(max, Math.max(min, value)));
            }
          }}
          placeholder={placeholder}
          className="w-full rounded-2xl bg-transparent px-4 py-3 text-sm text-ink outline-none placeholder:font-normal placeholder:text-ink-soft/50"
        />
        <span className="shrink-0 text-xs font-semibold text-ink-soft">{unit}</span>
      </div>
    </div>
  );
}

type StepId =
  | "conditions"
  | "medDoses"
  | "medTimes"
  | "medRelation"
  | "medTypes"
  | "goals"
  | "activity"
  | "sex"
  | "body";

/**
 * "My details": health conditions, medicine timing and, for Plus/Dietitian
 * (and a trial), the goal/activity/body numbers behind the daily calorie target.
 * Nothing here writes a number to any food card: it only feeds
 * lib/personalization.ts's ranking bias and lib/tdee.ts's calorie maths.
 *
 * ONE QUESTION PER SCREEN (UX review, 2026-10-07). It used to be a single long
 * blue form of about 15 questions with one Save button at the very bottom, and
 * people lost their place or left without saving. Now:
 * - a first-timer walks through the questions one at a time, with a progress
 *   bar, Back, and Next (which reads "Skip" while nothing is chosen);
 * - answers are saved once, by "Save my details" on the summary. Saving on
 *   every Next was tried and was a real bug: each save makes the meal card,
 *   the calorie tile and the extras card reload, and seven of those at once
 *   left the final Save stuck behind them on a slow connection. The tab stays
 *   mounted while hidden, so moving between tabs loses nothing, and the
 *   summary says plainly when there are changes not saved yet;
 * - the last screen is a summary of every answer, with the calorie target at
 *   the top. Tapping any answer goes straight back to that question;
 * - somebody who has answered before opens straight onto that summary.
 *
 * Conditions and medicine are free on every tier (safety, not a perk); the goal
 * and body questions only appear when `showGoals` is true.
 */
export default function PersonalizationSettings({
  showGoals,
  onSaved,
}: {
  showGoals: boolean;
  /** Called after "Save my details" — the caller sends the person to today's
   *  meal card, so "did it save?" is answered a second, unmissable way beyond
   *  the toast (founder instruction, 2026-08-29). */
  onSaved?: () => void;
}) {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [activityLevel, setActivityLevel] = useState<ActivityLevel | null>(null);
  const [mealPattern, setMealPattern] = useState<NamedMeal[]>(MEALS);
  const [sex, setSex] = useState<Sex | null>(null);
  const [ageYears, setAgeYears] = useState<number | null>(null);
  const [weightKg, setWeightKg] = useState<number | null>(null);
  const [heightCm, setHeightCm] = useState<number | null>(null);
  const [conditions, setConditions] = useState<Condition[]>([]);
  const [medDosesPerDay, setMedDosesPerDay] = useState<number | null>(null);
  const [medTimes, setMedTimes] = useState<MedTime[]>([]);
  const [medRelationToFood, setMedRelationToFood] = useState<"before" | "after" | null>(null);
  const [medTypes, setMedTypes] = useState<MedType[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveFailed, setSaveFailed] = useState(false);
  /** The question on screen, or null for the summary. */
  const [step, setStep] = useState<StepId | null>("conditions");
  /** The answers as last saved, to tell "changes not saved yet". */
  const [savedSnap, setSavedSnap] = useState("");

  useEffect(() => {
    readPersonalizationProfile().then((p) => {
      setGoals(p.goals);
      setActivityLevel(p.activityLevel);
      setMealPattern(p.mealPattern);
      setSex(p.sex);
      setAgeYears(p.ageYears);
      setWeightKg(p.weightKg);
      setHeightCm(p.heightCm);
      setConditions(p.conditions);
      setMedDosesPerDay(p.medDosesPerDay);
      setMedTimes(p.medTimes);
      setMedRelationToFood(p.medRelationToFood);
      setMedTypes(p.medTypes);
      // Answered before: open on the summary, not on question 1 again.
      const answeredBefore =
        p.medDosesPerDay != null || p.conditions.length > 0 || p.sex != null || p.activityLevel != null;
      setStep(answeredBefore ? null : "conditions");
      setSavedSnap(
        JSON.stringify([
          p.goals, p.activityLevel, p.sex, p.ageYears, p.weightKg, p.heightCm,
          p.conditions, p.medDosesPerDay, p.medTimes, p.medRelationToFood, p.medTypes,
        ]),
      );
      setLoaded(true);
    });
  }, []);

  const toggleGoal = (g: Goal) =>
    setGoals((cur) => (cur.includes(g) ? cur.filter((x) => x !== g) : [...cur, g]));
  const toggleCondition = (c: Condition) =>
    setConditions((cur) => (cur.includes(c) ? cur.filter((x) => x !== c) : [...cur, c]));
  const toggleMedTime = (t: MedTime) =>
    setMedTimes((cur) => (cur.includes(t) ? cur.filter((x) => x !== t) : [...cur, t]));
  // "I don't know the name" stands alone; picking a name clears it.
  const toggleMedType = (t: MedType) =>
    setMedTypes((cur) => {
      if (cur.includes(t)) return cur.filter((x) => x !== t);
      if (t === "unknown") return ["unknown"];
      return [...cur.filter((x) => x !== "unknown"), t];
    });

  const persist = () =>
    savePersonalizationProfile({
      goals,
      activityLevel,
      mealPattern,
      sex,
      ageYears,
      weightKg,
      heightCm,
      conditions,
      medDosesPerDay,
      medTimes,
      medRelationToFood,
      medTypes,
    });

  const save = async () => {
    setSaved(false);
    setSaveFailed(false);
    const ok = await persist();
    if (ok) {
      setSavedSnap(snapshot);
      setSaved(true);
      showToast("Saved");
      setTimeout(() => setSaved(false), 2500);
      onSaved?.();
    } else {
      // A failed save must say so; the button sitting there silently was a
      // real bug once (see CLAUDE.md).
      setSaveFailed(true);
    }
  };

  const snapshot = JSON.stringify([
    goals, activityLevel, sex, ageYears, weightKg, heightCm,
    conditions, medDosesPerDay, medTimes, medRelationToFood, medTypes,
  ]);
  const unsaved = loaded && snapshot !== savedSnap;

  if (!loaded) return null;

  const takesMedicine = medDosesPerDay != null && medDosesPerDay > 0;
  const steps: StepId[] = [
    "conditions",
    "medDoses",
    ...(takesMedicine ? (["medTimes", "medRelation", "medTypes"] as StepId[]) : []),
    ...(showGoals ? (["goals", "activity", "sex", "body"] as StepId[]) : []),
  ];
  const index = step ? steps.indexOf(step) : steps.length;
  const goTo = (s: StepId | null) => {
    setStep(s);
    setSaveFailed(false);
  };
  const next = () => goTo(index + 1 < steps.length ? steps[index + 1] : null);
  const back = () => goTo(index > 0 ? steps[index - 1] : null);

  const bmrValue =
    sex && ageYears && weightKg && heightCm ? bmr(sex, weightKg, heightCm, ageYears) : null;
  const tdeeValue = bmrValue != null && activityLevel ? tdee(bmrValue, activityLevel) : null;
  const targetValue = tdeeValue != null ? calorieTarget(tdeeValue, goals) : null;
  // Needs only weight/height, so it can show before sex/age/activity are in.
  const bmiValue = weightKg && heightCm ? bmi(weightKg, heightCm) : null;

  /** Each question: what it asks, a helper line, whether it has an answer, and the options. */
  const QUESTIONS: Record<StepId, { title: string; help?: string; answered: boolean; body: React.ReactNode }> = {
    conditions: {
      title: "Do you have any of these?",
      help: "Tick all that apply.",
      answered: true,
      body: (
        <>
          {CONDITIONS.map((c) => (
            <OptionRow key={c} multi active={conditions.includes(c)} onClick={() => toggleCondition(c)}>
              {CONDITION_LABEL[c]}
            </OptionRow>
          ))}
          <OptionRow multi active={conditions.length === 0} onClick={() => setConditions([])}>
            None of these
          </OptionRow>
        </>
      ),
    },
    medDoses: {
      title: "How many times a day do you take diabetes medicine?",
      answered: medDosesPerDay != null,
      body: MED_DOSE_OPTIONS.map((o) => (
        <OptionRow
          key={o.value}
          active={medDosesPerDay === o.value}
          onClick={() => {
            setMedDosesPerDay(o.value);
            if (o.value === 0) {
              setMedTimes([]);
              setMedRelationToFood(null);
              setMedTypes([]);
            }
          }}
        >
          {o.label}
        </OptionRow>
      )),
    },
    medTimes: {
      title: "When do you take it?",
      help: "Tick all that apply.",
      answered: medTimes.length > 0,
      body: MED_TIMES.map((t) => (
        <OptionRow key={t} multi active={medTimes.includes(t)} onClick={() => toggleMedTime(t)}>
          {MED_TIME_LABEL[t]}
        </OptionRow>
      )),
    },
    medRelation: {
      title: "Do you take it before or after eating?",
      answered: medRelationToFood != null,
      body: (["before", "after"] as const).map((r) => (
        <OptionRow
          key={r}
          active={medRelationToFood === r}
          onClick={() => setMedRelationToFood((cur) => (cur === r ? null : r))}
        >
          {r === "before" ? "Before eating" : "After eating"}
        </OptionRow>
      )),
    },
    medTypes: {
      title: "Which medicine do you take?",
      help: "Tick all that apply.",
      answered: medTypes.length > 0,
      body: MED_TYPE_OPTIONS.map((o) => (
        <OptionRow key={o.value} multi active={medTypes.includes(o.value)} onClick={() => toggleMedType(o.value)}>
          {o.label}
        </OptionRow>
      )),
    },
    goals: {
      title: "What are your goals?",
      help: "Tick all that apply.",
      answered: goals.length > 0,
      body: GOALS.map((g) => (
        <OptionRow key={g} multi active={goals.includes(g)} onClick={() => toggleGoal(g)}>
          {GOAL_LABEL[g]}
        </OptionRow>
      )),
    },
    activity: {
      title: "How active are you?",
      help: "Pick the one closest to a normal week for you.",
      answered: activityLevel != null,
      body: ACTIVITY_LEVELS.map((a) => (
        <OptionRow key={a} active={activityLevel === a} onClick={() => setActivityLevel(a)} sub={ACTIVITY_DESCRIPTION[a]}>
          {ACTIVITY_LABEL[a]}
        </OptionRow>
      )),
    },
    sex: {
      title: "Are you male or female?",
      help: "This changes how many calories your body uses.",
      answered: sex != null,
      body: SEXES.map((s) => (
        <OptionRow key={s} active={sex === s} onClick={() => setSex((cur) => (cur === s ? null : s))}>
          {SEX_LABEL[s]}
        </OptionRow>
      )),
    },
    body: {
      title: "Your age, weight and height",
      help: "We use these to work out your daily calories.",
      answered: ageYears != null && weightKg != null && heightCm != null,
      body: (
        <div className="space-y-3.5">
          <NumberField id="gf-age" label="Age" unit="years" value={ageYears} onChange={setAgeYears} placeholder="45" min={1} max={120} />
          <NumberField id="gf-weight" label="Weight" unit="kg" value={weightKg} onChange={setWeightKg} placeholder="70" min={20} max={300} />
          <NumberField id="gf-height" label="Height" unit="cm" value={heightCm} onChange={setHeightCm} placeholder="165" min={50} max={250} />
        </div>
      ),
    },
  };

  /** One line per answer on the summary. */
  const ANSWERS: Record<StepId, { label: string; value: string | null }> = {
    conditions: {
      label: "Health conditions",
      value: conditions.length ? conditions.map((c) => CONDITION_LABEL[c]).join(", ") : "None",
    },
    medDoses: {
      label: "Diabetes medicine",
      value: MED_DOSE_OPTIONS.find((o) => o.value === medDosesPerDay)?.label ?? null,
    },
    medTimes: {
      label: "When you take it",
      value: medTimes.length ? medTimes.map((t) => MED_TIME_LABEL[t]).join(", ") : null,
    },
    medRelation: {
      label: "Before or after eating",
      value: medRelationToFood ? (medRelationToFood === "before" ? "Before eating" : "After eating") : null,
    },
    medTypes: {
      label: "Which medicine",
      value: medTypes.length
        ? medTypes.map((t) => MED_TYPE_OPTIONS.find((o) => o.value === t)?.label ?? t).join(", ")
        : null,
    },
    goals: { label: "Goals", value: goals.length ? goals.map((g) => GOAL_LABEL[g]).join(", ") : null },
    activity: { label: "How active", value: activityLevel ? ACTIVITY_LABEL[activityLevel] : null },
    sex: { label: "Male or female", value: sex ? SEX_LABEL[sex] : null },
    body: {
      label: "Age, weight, height",
      value:
        ageYears != null || weightKg != null || heightCm != null
          ? [
              ageYears != null ? `${ageYears} years` : null,
              weightKg != null ? `${weightKg} kg` : null,
              heightCm != null ? `${heightCm} cm` : null,
            ]
              .filter(Boolean)
              .join(", ")
          : null,
    },
  };

  const header = (
    <div className="flex items-center gap-3">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white/15 text-white ring-1 ring-inset ring-white/25">
        <UserRound className="h-5 w-5" strokeWidth={2.2} />
      </span>
      <div className="min-w-0">
        <p className="font-display text-base font-bold leading-tight text-white">My details</p>
        <p className="text-xs text-white/75">
          {step ? `Question ${index + 1} of ${steps.length}` : "Tap any answer to change it."}
        </p>
      </div>
    </div>
  );

  // ---- One question ----------------------------------------------------------
  if (step) {
    const q = QUESTIONS[step];
    const last = index === steps.length - 1;
    return (
      // Solid brand blue, white text (founder instruction, 2026-08-30).
      <div className="rounded-3xl bg-brand p-5 shadow-[0_18px_44px_-20px_rgba(12,42,71,0.6)] sm:p-6">
        {header}
        <div
          className="mt-4 h-1.5 overflow-hidden rounded-full bg-white/20"
          role="progressbar"
          aria-label="How far through the questions you are"
          aria-valuemin={1}
          aria-valuemax={steps.length}
          aria-valuenow={index + 1}
        >
          <div
            className="h-full rounded-full bg-leaf transition-[width] duration-500 ease-out"
            style={{ width: `${((index + 1) / steps.length) * 100}%` }}
          />
        </div>

        <div key={step} className="step-in mt-6">
          <h2 className="text-sm font-semibold leading-snug text-white">{q.title}</h2>
          {q.help && <p className="mt-1 text-xs text-white/70">{q.help}</p>}
          <div className="mt-5 space-y-2.5">{q.body}</div>
        </div>

        <div className="mt-7 flex items-center gap-3">
          {index > 0 ? (
            <button
              type="button"
              onClick={back}
              className="flex items-center gap-1.5 rounded-full bg-white/15 px-5 py-3 text-sm font-semibold text-white ring-1 ring-inset ring-white/25 transition-colors hover:bg-white/25"
            >
              <ArrowLeft className="h-4 w-4" strokeWidth={2.5} /> Back
            </button>
          ) : null}
          <button
            type="button"
            onClick={next}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-full px-5 py-3 text-sm font-bold transition-all ${
              q.answered
                ? "bg-leaf text-white shadow-[0_12px_26px_-12px_rgba(46,204,113,0.95)] hover:bg-leaf-deep"
                : "bg-white/15 text-white ring-1 ring-inset ring-white/30 hover:bg-white/25"
            }`}
          >
            {!q.answered ? "Skip" : last ? "See my details" : "Next"}
            <ChevronRight className="h-4 w-4" strokeWidth={2.5} />
          </button>
        </div>
      </div>
    );
  }

  // ---- The summary -------------------------------------------------------------
  return (
    <div className="step-in rounded-3xl bg-brand p-5 shadow-[0_18px_44px_-20px_rgba(12,42,71,0.6)] sm:p-6">
      {header}

      {targetValue != null && (
        <div className="mt-5 overflow-hidden rounded-2xl bg-white/15 p-4 text-white ring-1 ring-inset ring-white/25">
          <p className="text-xs font-semibold uppercase tracking-wide text-white/80">Your daily calorie target</p>
          <p className="font-display text-3xl font-bold leading-tight">
            {targetValue} <span className="text-base font-semibold text-white/80">kcal a day</span>
          </p>
          <div className="mt-3 flex flex-wrap gap-x-6 gap-y-2 border-t border-white/25 pt-3 text-xs text-white/85">
            <p>
              Resting energy <strong className="block text-sm text-white">{Math.round(bmrValue!)} kcal</strong>
            </p>
            <p>
              Full daily need <strong className="block text-sm text-white">{Math.round(tdeeValue!)} kcal</strong>
            </p>
            {bmiValue != null && (
              <p>
                Weight status{" "}
                <strong className="block text-sm text-white">{BMI_CATEGORY_LABEL[bmiCategory(bmiValue)]}</strong>
              </p>
            )}
          </div>
        </div>
      )}
      {/* Weight and height alone are enough for this, so it does not wait on
          the rest (a reviewing dietitian found no weight status anywhere). */}
      {targetValue == null && bmiValue != null && (
        <p className="mt-5 rounded-2xl bg-white/15 p-4 text-sm text-white ring-1 ring-inset ring-white/25">
          Weight status: <strong className="font-display">{BMI_CATEGORY_LABEL[bmiCategory(bmiValue)]}</strong>
        </p>
      )}

      <ul className="mt-5 divide-y divide-line overflow-hidden rounded-2xl bg-white">
        {steps.map((s) => {
          const a = ANSWERS[s];
          return (
            <li key={s}>
              <button
                type="button"
                onClick={() => goTo(s)}
                aria-label={`Change: ${a.label}`}
                className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-mist"
              >
                <span className="min-w-0 flex-1">
                  <span className="block text-xs font-semibold text-ink-soft">{a.label}</span>
                  <span className={`block text-sm font-semibold ${a.value ? "text-ink" : "text-brand"}`}>
                    {a.value ?? "Tap to answer"}
                  </span>
                </span>
                <ChevronRight className="h-5 w-5 shrink-0 text-ink-soft/60" />
              </button>
            </li>
          );
        })}
      </ul>

      {unsaved && (
        <p className="mt-5 rounded-xl bg-white/15 px-3 py-2 text-sm font-semibold text-white ring-1 ring-inset ring-white/25">
          You have changes that are not saved yet.
        </p>
      )}

      {/* Green, not blue: the card is blue, and the house rule is that a
          surface is blue or green, so its one action is the other colour. */}
      <button
        onClick={save}
        className="mt-5 flex w-full items-center justify-center gap-2 rounded-full bg-leaf px-5 py-3 text-sm font-bold text-white shadow-[0_12px_26px_-12px_rgba(46,204,113,0.95)] transition-colors hover:bg-leaf-deep"
      >
        {saved ? (
          <>
            <Check className="h-4 w-4" /> Saved
          </>
        ) : (
          "Save my details"
        )}
      </button>
      {saveFailed && (
        <p className="mt-3 rounded-xl bg-white/90 px-3 py-2 text-sm font-semibold text-verdict-red">
          This did not save. Check your connection and try again.
        </p>
      )}
    </div>
  );
}
