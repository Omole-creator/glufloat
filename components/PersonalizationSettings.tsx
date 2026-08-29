"use client";

import { useEffect, useState } from "react";
import { Check, Target } from "lucide-react";
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
  CONDITIONS,
  CONDITION_LABEL,
  type Sex,
  type Condition,
} from "@/lib/tdee";
import {
  readPersonalizationProfile,
  savePersonalizationProfile,
  type MedTime,
} from "@/lib/personalizationProfile";
import type { NamedMeal } from "@/lib/mealtime";
import { showToast } from "@/components/Toast";

const MEAL_LABEL: Record<NamedMeal, string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  dinner: "Dinner",
};
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

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
        active
          ? "bg-leaf text-white"
          : "bg-mist text-ink-soft ring-1 ring-inset ring-line hover:bg-mint"
      }`}
    >
      {children}
    </button>
  );
}

function NumberField({
  label,
  value,
  onChange,
  placeholder,
  min,
  max,
}: {
  label: string;
  value: number | null;
  onChange: (n: number | null) => void;
  placeholder: string;
  /** Matches the DB check constraint (health-profile-schema.sql) — clamped
   *  here too, so the live BMR/TDEE readout below can never show a nonsense
   *  number from an out-of-range weight/height/age while typing. */
  min: number;
  max: number;
}) {
  return (
    <label className="block">
      <span className="block text-xs font-semibold text-ink-soft">{label}</span>
      <input
        type="number"
        inputMode="decimal"
        min={min}
        max={max}
        value={value ?? ""}
        onChange={(e) => {
          // Clamping every keystroke would trap a multi-digit number typed
          // from the low end (e.g. typing "70" clamps to the min the moment
          // "7" alone is on screen) — accept any in-progress value here and
          // only clamp once the field is left, on blur below.
          const raw = e.target.value;
          onChange(raw === "" ? null : Number(raw));
        }}
        onBlur={() => {
          if (value != null && !Number.isNaN(value)) {
            onChange(Math.min(max, Math.max(min, value)));
          }
        }}
        placeholder={placeholder}
        className="mt-1 w-full rounded-xl border border-line bg-white px-3 py-2 text-sm text-ink outline-none focus:border-brand"
      />
    </label>
  );
}

/**
 * Where a Plus/Dietitian person (and a trial previewing Plus) sets goal,
 * activity level, and the TDEE/BMR inputs (sex/age/weight/height) that drive
 * their daily calorie target. Nothing here writes a new number to any food
 * card — it only feeds lib/personalization.ts's ranking bias, lib/tdee.ts's
 * calorie math, and lib/mealPattern.ts's display filter. Meal pattern,
 * health conditions, and medication timing are always shown, even to someone
 * with no goal access, since they are free on every tier (safety-relevant,
 * not a paid perk) — the caller controls the gated block via `showGoals`.
 */
export default function PersonalizationSettings({ showGoals }: { showGoals: boolean }) {
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
  const [loaded, setLoaded] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveFailed, setSaveFailed] = useState(false);

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
      setLoaded(true);
    });
  }, []);

  const toggleGoal = (g: Goal) =>
    setGoals((cur) => (cur.includes(g) ? cur.filter((x) => x !== g) : [...cur, g]));

  // Free choice of any combination, including all 3 or just 1. An empty
  // selection is not blocked here — normalizeMealPattern (lib/mealPattern.ts)
  // already treats "nothing set" as "eats all 3", so there is nothing unsafe
  // about letting someone freely toggle every chip. The earlier version
  // silently refused the last remaining chip to avoid an empty state, which
  // just looked like the third meal did not respond to a click.
  const toggleMeal = (m: NamedMeal) =>
    setMealPattern((cur) => (cur.includes(m) ? cur.filter((x) => x !== m) : [...cur, m]));

  const toggleCondition = (c: Condition) =>
    setConditions((cur) => (cur.includes(c) ? cur.filter((x) => x !== c) : [...cur, c]));

  const toggleMedTime = (t: MedTime) =>
    setMedTimes((cur) => (cur.includes(t) ? cur.filter((x) => x !== t) : [...cur, t]));

  const save = async () => {
    setSaved(false);
    setSaveFailed(false);
    const ok = await savePersonalizationProfile({
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
    });
    if (ok) {
      setSaved(true);
      showToast("Saved");
      setTimeout(() => setSaved(false), 2500);
    } else {
      // A failed save used to do nothing visible at all — the button just sat
      // there, and someone whose input got rejected (or who lost connection)
      // had no way to know their settings never saved.
      setSaveFailed(true);
    }
  };

  if (!loaded) return null;

  const bmrValue =
    sex && ageYears && weightKg && heightCm ? bmr(sex, weightKg, heightCm, ageYears) : null;
  const tdeeValue = bmrValue != null && activityLevel ? tdee(bmrValue, activityLevel) : null;
  const targetValue = tdeeValue != null ? calorieTarget(tdeeValue, goals) : null;

  return (
    <div className="rounded-2xl bg-white p-4 shadow-[0_6px_28px_-14px_rgba(12,42,71,0.2)] ring-1 ring-brand/10 sm:p-5">
      <div className="flex items-center gap-2.5">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand/10 text-brand ring-1 ring-inset ring-brand/15">
          <Target className="h-4.5 w-4.5" strokeWidth={2.2} />
        </span>
        <p className="font-display text-base font-bold text-ink">Make GluFloat fit you</p>
      </div>

      <p className="mt-3 text-sm font-semibold text-ink-soft">Which meals do you eat?</p>
      <p className="mt-0.5 text-xs text-ink-soft">Select all that apply.</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {MEALS.map((m) => (
          <Chip key={m} active={mealPattern.includes(m)} onClick={() => toggleMeal(m)}>
            {MEAL_LABEL[m]}
          </Chip>
        ))}
      </div>

      <p className="mt-4 text-sm font-semibold text-ink-soft">Do you have any of these?</p>
      <p className="mt-0.5 text-xs text-ink-soft">Select all that apply.</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {CONDITIONS.map((c) => (
          <Chip key={c} active={conditions.includes(c)} onClick={() => toggleCondition(c)}>
            {CONDITION_LABEL[c]}
          </Chip>
        ))}
        <Chip active={conditions.length === 0} onClick={() => setConditions([])}>
          None of the above
        </Chip>
      </div>

      <p className="mt-4 text-sm font-semibold text-ink-soft">
        How many times a day do you take diabetes medication?
      </p>
      <div className="mt-2 flex flex-wrap gap-2">
        {MED_DOSE_OPTIONS.map((o) => (
          <Chip
            key={o.value}
            active={medDosesPerDay === o.value}
            onClick={() => {
              setMedDosesPerDay(o.value);
              if (o.value === 0) {
                setMedTimes([]);
                setMedRelationToFood(null);
              }
            }}
          >
            {o.label}
          </Chip>
        ))}
      </div>

      {medDosesPerDay != null && medDosesPerDay > 0 && (
        <>
          <p className="mt-4 text-sm font-semibold text-ink-soft">When do you take it?</p>
          <p className="mt-0.5 text-xs text-ink-soft">Select all that apply.</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {MED_TIMES.map((t) => (
              <Chip key={t} active={medTimes.includes(t)} onClick={() => toggleMedTime(t)}>
                {MED_TIME_LABEL[t]}
              </Chip>
            ))}
          </div>

          <p className="mt-4 text-sm font-semibold text-ink-soft">
            Do you take it before or after eating?
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            <Chip
              active={medRelationToFood === "before"}
              onClick={() => setMedRelationToFood((cur) => (cur === "before" ? null : "before"))}
            >
              Before eating
            </Chip>
            <Chip
              active={medRelationToFood === "after"}
              onClick={() => setMedRelationToFood((cur) => (cur === "after" ? null : "after"))}
            >
              After eating
            </Chip>
          </div>
        </>
      )}

      {showGoals && (
        <>
          <p className="mt-4 text-sm font-semibold text-ink-soft">What are your goals?</p>
          <p className="mt-0.5 text-xs text-ink-soft">Select all that apply.</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {GOALS.map((g) => (
              <Chip key={g} active={goals.includes(g)} onClick={() => toggleGoal(g)}>
                {GOAL_LABEL[g]}
              </Chip>
            ))}
          </div>

          <p className="mt-4 text-sm font-semibold text-ink-soft">How active are you?</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {ACTIVITY_LEVELS.map((a) => (
              <Chip
                key={a}
                active={activityLevel === a}
                onClick={() => setActivityLevel((cur) => (cur === a ? null : a))}
              >
                {ACTIVITY_LABEL[a]}
              </Chip>
            ))}
          </div>

          <p className="mt-4 text-sm font-semibold text-ink-soft">
            Tell us about you, so we can work out your daily calories
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {SEXES.map((s) => (
              <Chip key={s} active={sex === s} onClick={() => setSex((cur) => (cur === s ? null : s))}>
                {SEX_LABEL[s]}
              </Chip>
            ))}
          </div>
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <NumberField
              label="Age (years)"
              value={ageYears}
              onChange={setAgeYears}
              placeholder="e.g. 45"
              min={1}
              max={120}
            />
            <NumberField
              label="Weight (kg)"
              value={weightKg}
              onChange={setWeightKg}
              placeholder="e.g. 70"
              min={20}
              max={300}
            />
            <NumberField
              label="Height (cm)"
              value={heightCm}
              onChange={setHeightCm}
              placeholder="e.g. 165"
              min={50}
              max={250}
            />
          </div>

          {targetValue != null && (
            <div className="mt-3 rounded-xl border border-line bg-mist p-3 text-sm text-ink">
              <p>
                Resting energy (BMR): <strong>{Math.round(bmrValue!)} kcal a day</strong>
              </p>
              <p className="mt-1">
                Full daily need with your activity (TDEE):{" "}
                <strong>{Math.round(tdeeValue!)} kcal a day</strong>
              </p>
              <p className="mt-1">
                Your daily calorie target: <strong>{targetValue} kcal a day</strong>
              </p>
            </div>
          )}
        </>
      )}

      <button
        onClick={save}
        className="mt-5 flex items-center gap-2 rounded-full bg-brand px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-brand-deep"
      >
        {saved ? (
          <>
            <Check className="h-4 w-4" /> Saved
          </>
        ) : (
          "Save"
        )}
      </button>
      {saveFailed && (
        <p className="mt-2 text-sm font-semibold text-verdict-red">
          This did not save. Check your connection and try again.
        </p>
      )}
    </div>
  );
}
