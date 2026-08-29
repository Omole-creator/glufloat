"use client";

import { useEffect, useState } from "react";
import { Check, Target, HeartPulse, Pill, Sparkles, Flame, ChevronDown } from "lucide-react";
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
  ACTIVITY_DESCRIPTION,
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
  const [activityOpen, setActivityOpen] = useState(false);

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

      {/* Section: health conditions */}
      <div className="mt-5 border-t border-line pt-4">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-leaf/10 text-leaf-deep ring-1 ring-inset ring-leaf/15">
            <HeartPulse className="h-3.5 w-3.5" strokeWidth={2.4} />
          </span>
          <p className="text-sm font-semibold text-ink">Do you have any of these?</p>
        </div>
        <p className="mt-1 text-xs text-ink-soft">Select all that apply.</p>
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
      </div>

      {/* Section: medication timing */}
      <div className="mt-5 border-t border-line pt-4">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-brand/10 text-brand ring-1 ring-inset ring-brand/15">
            <Pill className="h-3.5 w-3.5" strokeWidth={2.4} />
          </span>
          <p className="text-sm font-semibold text-ink">
            How many times a day do you take diabetes medication?
          </p>
        </div>
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
      </div>

      {showGoals && (
        <div className="mt-5 border-t border-line pt-4">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-leaf/10 text-leaf-deep ring-1 ring-inset ring-leaf/15">
              <Sparkles className="h-3.5 w-3.5" strokeWidth={2.4} />
            </span>
            <p className="text-sm font-semibold text-ink">What are your goals?</p>
          </div>
          <p className="mt-1 text-xs text-ink-soft">Select all that apply.</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {GOALS.map((g) => (
              <Chip key={g} active={goals.includes(g)} onClick={() => toggleGoal(g)}>
                {GOAL_LABEL[g]}
              </Chip>
            ))}
          </div>

          <p className="mt-4 text-sm font-semibold text-ink-soft">How physically active are you?</p>
          <div className="relative mt-2">
            <button
              type="button"
              onClick={() => setActivityOpen((v) => !v)}
              aria-expanded={activityOpen}
              className="flex w-full items-center justify-between rounded-xl border border-line bg-white px-3.5 py-2.5 text-left text-sm outline-none focus:border-brand"
            >
              <span className={activityLevel ? "font-semibold text-ink" : "text-ink-soft"}>
                {activityLevel ? ACTIVITY_LABEL[activityLevel] : "Select one"}
              </span>
              <ChevronDown
                className={`h-4 w-4 shrink-0 text-ink-soft transition-transform ${activityOpen ? "rotate-180" : ""}`}
              />
            </button>

            {activityOpen && (
              <div className="absolute z-10 mt-1 w-full overflow-hidden rounded-xl border border-line bg-white shadow-[0_12px_32px_-12px_rgba(12,42,71,0.3)]">
                {ACTIVITY_LEVELS.map((a) => (
                  <button
                    key={a}
                    type="button"
                    onClick={() => {
                      setActivityLevel(a);
                      setActivityOpen(false);
                    }}
                    className={`block w-full border-b border-line px-3.5 py-2.5 text-left last:border-b-0 hover:bg-mist ${
                      activityLevel === a ? "bg-leaf/5" : ""
                    }`}
                  >
                    <span className={`text-sm font-semibold ${activityLevel === a ? "text-leaf-deep" : "text-ink"}`}>
                      {ACTIVITY_LABEL[a]}
                    </span>
                    <span className="mt-0.5 block text-xs leading-snug text-ink-soft">
                      {ACTIVITY_DESCRIPTION[a]}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="mt-5 border-t border-line pt-4">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-brand/10 text-brand ring-1 ring-inset ring-brand/15">
                <Flame className="h-3.5 w-3.5" strokeWidth={2.4} />
              </span>
              <p className="text-sm font-semibold text-ink">
                Tell us about you, so we can work out your daily calories
              </p>
            </div>
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

            {/* One clear answer first — the target — with how it was worked
                out folded underneath as quiet supporting context, not three
                lines of equal weight fighting for attention. */}
            {targetValue != null && (
              <div className="mt-4 overflow-hidden rounded-2xl bg-gradient-to-br from-brand to-leaf p-4 text-white">
                <p className="text-xs font-semibold uppercase tracking-wide text-white/80">
                  Your daily calorie target
                </p>
                <p className="font-display text-3xl font-bold leading-tight">
                  {targetValue} <span className="text-base font-semibold text-white/80">kcal a day</span>
                </p>
                <div className="mt-3 flex gap-5 border-t border-white/25 pt-3 text-xs text-white/85">
                  <p>
                    Resting energy <strong className="block text-sm text-white">{Math.round(bmrValue!)} kcal</strong>
                  </p>
                  <p>
                    Full daily need <strong className="block text-sm text-white">{Math.round(tdeeValue!)} kcal</strong>
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
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
