import { getFood } from "./search";
import type { Food } from "./types";
import type { NamedMeal } from "./mealtime";
import { cleanFoodName } from "./foodName";
import { biasScore, type PlateAxes, type Condition } from "./personalization";

/**
 * Safe meal ideas to suggest for the meal happening right now.
 *
 * Every idea is a small, real Nigerian plate built only from foods the app marks
 * green, so a suggestion is always a good one, and the plates are grouped by the
 * meal people actually eat them at. This is what answers "what should I eat?"
 * without the person having to think of it themselves.
 *
 * TWO founder rules govern this file, and both have been broken here before:
 *
 *  1. **Every idea must be a real plate people eat together.** No odd
 *     combinations. That is why the lunch and dinner plates below are BUILT FROM
 *     TEMPLATES rather than free combinations: a swallow only ever meets a soup
 *     that is genuinely eaten with swallow, and only ever meets a protein from an
 *     explicit whitelist. Nothing here can produce "coleslaw in egusi soup".
 *  2. **The meal must suit the time of day.** Breakfast is a hand-written list of
 *     real Nigerian breakfasts. It used to contain two swallow-and-soup plates
 *     (oat swallow with vegetable soup, and oat swallow with egusi and fish),
 *     which are lunch plates and were being offered at 7am. Do not put a
 *     swallow-and-soup plate in the breakfast list; scripts/meal-ideas-test.ts
 *     fails if you do.
 *
 * Ids are the food ids in data/foods.json. If a food is ever renamed or removed,
 * getFood drops it and the rest of the plate still shows.
 */

/**
 * The only proteins that may be put into a soup. Deliberately a hand-kept list,
 * never everything with `category: protein` — that list contains coleslaw, tuna
 * salad and coated things that nobody puts in egusi.
 */
const SOUP_PROTEINS = [
  "fish",
  "chicken",
  "goat-meat",
  "beef",
  "turkey",
  "snail",
  "prawns-crayfish",
  "smoked-fish",
  "stockfish",
  "pomo",
  "shaki",
];

/**
 * Which SOUP_PROTEINS should not be handed to someone with a flagged
 * comorbidity. Computed from the food data itself, not a hand-kept id list
 * — a reviewing dietitian flagged that the app offers organ meat (pomo,
 * shaki) as an interchangeable swap for beef/fish with no regard for the
 * person's own comorbidities (2026-09-06 feedback: "before you start
 * prescribing a meal ... you have to make sure the meal is according to
 * their disease condition").
 *
 * Checking the data turned up the SAME gap on more proteins than first
 * reported: `beef` and `goat-meat` carry the identical "pick fish or
 * skinless chicken instead" instruction as the organ meats (they are ALL
 * red/organ meat under one healthNote), and `stockfish`/`smoked-fish` carry
 * their own, separate "very salty ... if you have high blood pressure, high
 * cholesterol, or kidney problems" instruction. `SOUP_PROTEINS` only ever
 * holds actual protein foods, and every healthNote a protein in this list
 * carries already exists specifically to tell a person with one of these
 * three conditions to choose something else — so rather than hand-pick which
 * ids to exclude (and risk it silently drifting out of step, the same trap
 * `scripts/health-notes.mjs`'s own notes warn about elsewhere in this
 * codebase), this reads the flag directly off whichever proteins actually
 * carry a healthNote. `fish`, `chicken`, `turkey`, `snail` and
 * `prawns-crayfish` carry none and are never excluded.
 */
const CONDITION_EXCLUDED_PROTEIN_IDS = new Set(
  SOUP_PROTEINS.filter((id) => Boolean(getFood(id)?.healthNote)),
);

/** Any flagged condition is enough: every excluded protein's own healthNote
 * already names all three conditions together (see
 * CONDITION_EXCLUDED_PROTEIN_IDS above), so there is no case here where one
 * of the three should see it and another should not. */
function excludesRiskyProtein(conditions: Condition[]): boolean {
  return conditions.length > 0;
}

/**
 * The gram anchor for each scalable main-plate protein's OWN normal serving
 * — read directly from that food's own `portionGuidance` (data/foods.json),
 * the same real number already shown on its card, not a separate invented
 * figure. Deliberately the exact same 5 foods `CONDITION_EXCLUDED_PROTEIN_IDS`
 * excludes (every `SOUP_PROTEINS` entry with NO healthNote): scaling a
 * protein that already carries a salt/fat/cardiovascular caution
 * (beef, goat meat, pomo, shaki, stockfish, smoked fish) would compound an
 * existing concern, not just add calories, so those are never candidates
 * here regardless of the calorie math. `eggs` is a real, common main-plate
 * protein too but is deliberately excluded — its own portionGuidance
 * ("One to two eggs") has no single clean gram anchor to scale from, and
 * guessing one would be exactly the kind of invented number this codebase's
 * history (see CLAUDE.md's `PortionMini` note) has already been burned by.
 */
const MAIN_PROTEIN_BASE_GRAMS: Record<string, number> = {
  fish: 100,
  chicken: 90,
  turkey: 90,
  snail: 90,
  "prawns-crayfish": 90,
};

/**
 * How far a scalable protein's serving may safely grow, researched
 * 2026-09-08 (a founder question: can the main plate carry more of a
 * person's calorie need directly, instead of relying on many small
 * extras?). The honest answer has a real ceiling, not an open one: this
 * app's OWN base servings already sit at 14-28g protein (roughly the
 * commonly-cited 20-25g-per-meal target), and multiple sources caution that
 * eating more than about 75g of protein in one meal can cause a mild,
 * delayed rise in blood sugar 3-5 hours later — protein itself does not
 * spike glucose, but a genuinely large amount still has a measurable
 * gluconeogenesis effect. [Splenda](https://www.splenda.com/blog/the-importance-of-protein-for-people-with-diabetes/),
 * [DiabetesTeam](https://www.diabetesteam.com/resources/best-protein-for-diabetes-nutrition-and-blood-sugar).
 * 1.75x keeps every candidate here comfortably under that ceiling even at
 * its own highest-protein food (chicken, 27.9g base → ~48.8g scaled, still
 * well short of 75g) while still adding a real, worthwhile amount (roughly
 * 60-150kcal depending on the food) — genuinely more of the meal's own
 * calorie need met directly, never a "drastic" increase, because a drastic
 * one is exactly what the research above says not to do. Documented here,
 * pending dietitian sign-off, same footing as every other house number in
 * this file.
 */
const MAIN_PROTEIN_MAX_MULTIPLIER = 1.75;

/** How small the calorie gap has to be before scaling the protein up is not
 * worth the bother — matches the same threshold `MIN_ADD_KCAL` uses for
 * extras, for the same reason (not worth a whole extra serving instruction
 * over a rounding-sized difference). */
const MIN_PROTEIN_SCALE_KCAL = 20;

/** One food, scaled up from its own normal serving to help close a meal's
 * real calorie gap directly, rather than only through extras. Shared shape
 * for both the main-plate protein scaler and the breakfast side scaler
 * below — `ScaledProtein` is kept as the name used at protein call sites. */
export interface ScaledPortion {
  food: Food;
  name: string;
  /** The FULL new serving in grams (not just the added amount). */
  grams: number;
  /** The FULL new serving's calories (not just the added amount). */
  calories: number;
  /** calories - the food's own normal-serving calories; what this
   *  contributes toward closing the meal's gap. */
  extraCalories: number;
  /** A plain instruction naming the new size against the normal one, so a
   *  person sees both numbers, never just a bigger one with no anchor. */
  instruction: string;
}

export type ScaledProtein = ScaledPortion;

/**
 * Scales up the first scalable protein found in `foods` (a resolved plate)
 * to help close `gapKcal` of a meal's own calorie share — never past its
 * own safe ceiling (`MAIN_PROTEIN_MAX_MULTIPLIER`), and never at all for a
 * `kidney_disease` profile (protein is a real, tight daily budget for
 * kidney disease — `lib/tdee.ts`'s `proteinCapG` — the same reasoning
 * `lib/nextMeal.ts`'s own `guardedCandidate` already applies to extras).
 * Returns null when the plate has no scalable protein, the gap is too
 * small to bother, or the profile is kidney_disease.
 */
export function scaleMainProtein(
  foods: Food[],
  gapKcal: number,
  conditions: Condition[],
): ScaledProtein | null {
  if (conditions.includes("kidney_disease")) return null;
  if (!gapKcal || gapKcal < MIN_PROTEIN_SCALE_KCAL) return null;
  const food = foods.find((f) => MAIN_PROTEIN_BASE_GRAMS[f.id] != null);
  if (!food) return null;
  const baseGrams = MAIN_PROTEIN_BASE_GRAMS[food.id];
  const baseKcal = food.calories ?? 0;
  if (baseKcal <= 0) return null;
  const kcalPerGram = baseKcal / baseGrams;
  const maxGrams = Math.round(baseGrams * MAIN_PROTEIN_MAX_MULTIPLIER);
  const targetGrams = baseGrams + Math.round(gapKcal / kcalPerGram);
  const grams = Math.max(baseGrams, Math.min(maxGrams, targetGrams));
  if (grams <= baseGrams) return null;
  const calories = Math.round(grams * kcalPerGram);
  return {
    food,
    name: cleanFoodName(food.name),
    grams,
    calories,
    extraCalories: calories - baseKcal,
    instruction: `A bigger ${cleanFoodName(food.name).toLowerCase()} serving today: about ${grams}g, instead of the usual ${baseGrams}g. This helps meet your calorie goal, and protein this size stays safe for your sugar.`,
  };
}

/**
 * Real gram anchors and safe single-sitting ceilings for the second item on
 * a BREAKFAST plate that is neither a starch nor a protein — a fat/dairy
 * side, the same shape `docs/EVIDENCE.md` §9 already researched for the
 * extras pool. Deliberately the exact 4 foods §9 already names as "real
 * no-cook snacks, rejected from the extras pool only because they are
 * already used inside a BREAKFAST plate" — that rejection reasoning points
 * straight here: scale them as part of the meal they already belong to,
 * the same way `scaleMainProtein` scales a lunch/dinner soup's protein.
 * Multipliers researched against the ADA diabetes exchange list (fetched
 * live 2026-09-07): groundnut's 30g base already equals exactly one ADA
 * "fat exchange" (20 small peanuts), so 60g matches the same 60g/"1-2oz"
 * ceiling §9 already set for walnut/cashew/tiger-nut; avocado's 75g base
 * already exceeds a single ADA exchange (1/8 medium fruit), so a whole
 * 150g fruit is an ordinary single-sitting amount; plain yogurt's 300g is a
 * modest step past the ADA's one-cup (240g) milk exchange; soy milk gets a
 * smaller 1.5x (not 2x) for the same reason coconut did in §9 — doubling a
 * whole cup of one beverage in a sitting is a lot, a more modest top-up is
 * more realistic. See `docs/EVIDENCE.md`'s breakfast-side-scaling section
 * for the full citations. All four carry negligible sodium (5-113mg base).
 */
const MAIN_SIDE_CONFIG: Record<string, { baseGrams: number; maxGrams: number; unit: string }> = {
  groundnut: { baseGrams: 30, maxGrams: 60, unit: "g" },
  avocado: { baseGrams: 75, maxGrams: 150, unit: "g" },
  "plain-yogurt": { baseGrams: 150, maxGrams: 300, unit: "g" },
  "soy-milk": { baseGrams: 250, maxGrams: 375, unit: "ml" },
};

/** Same threshold `scaleMainProtein` uses — not worth a whole extra
 * instruction over a rounding-sized difference. */
const MIN_SIDE_SCALE_KCAL = 20;

/**
 * Scales up a breakfast plate's non-starch, non-protein side (groundnut,
 * avocado, plain yogurt, or soy milk — see `MAIN_SIDE_CONFIG`) to help
 * close `gapKcal` directly, the same idea as `scaleMainProtein` but for the
 * one real lever a plain-toppings breakfast has (most breakfast plates have
 * no `MAIN_PROTEIN_BASE_GRAMS` food at all). For a `kidney_disease` profile,
 * a candidate whose own base serving already carries meaningful protein
 * (plain yogurt 5.3g, soy milk 7g — both at or above the same
 * `PROTEIN_CAP_THRESHOLD_G` threshold `guardedCandidate()` uses for extras;
 * avocado at 1.5g and groundnut... see the exception below) is capped at
 * exactly its base serving, never scaled past it. Groundnut's base (7.8g)
 * is also above that threshold, so it is capped the same way for
 * `kidney_disease` — avocado is the one side that still scales freely for
 * that profile. Returns null when the plate has no matching side, the gap
 * is too small to bother, or the food's own calories are unset.
 */
export function scaleMainSide(
  foods: Food[],
  gapKcal: number,
  conditions: Condition[],
): ScaledPortion | null {
  if (!gapKcal || gapKcal < MIN_SIDE_SCALE_KCAL) return null;
  const food = foods.find((f) => MAIN_SIDE_CONFIG[f.id] != null);
  if (!food) return null;
  const config = MAIN_SIDE_CONFIG[food.id];
  const capProtein =
    conditions.includes("kidney_disease") && (food.proteinG ?? 0) >= PROTEIN_CAP_THRESHOLD_G;
  const maxGrams = capProtein ? config.baseGrams : config.maxGrams;
  const baseKcal = food.calories ?? 0;
  if (baseKcal <= 0) return null;
  const kcalPerGram = baseKcal / config.baseGrams;
  const targetGrams = config.baseGrams + Math.round(gapKcal / kcalPerGram);
  const grams = Math.max(config.baseGrams, Math.min(maxGrams, targetGrams));
  if (grams <= config.baseGrams) return null;
  const calories = Math.round(grams * kcalPerGram);
  return {
    food,
    name: cleanFoodName(food.name),
    grams,
    calories,
    extraCalories: calories - baseKcal,
    instruction: `A bigger ${cleanFoodName(food.name).toLowerCase()} serving today: about ${grams}${config.unit}, instead of the usual ${config.baseGrams}${config.unit}. This helps meet your calorie goal, and this size stays safe for your sugar.`,
  };
}

/**
 * Green soups that are genuinely eaten with a swallow. The stews and sauces
 * (tomato stew, ayamase, ofe akwu, garden egg sauce) are left out on purpose:
 * they are eaten with rice, and there is no green rice in the data, so pairing
 * one with a swallow would be an odd plate.
 */
const SWALLOW_SOUPS = [
  "egusi-soup",
  "ogbono-soup",
  "efo-riro",
  "edikang-ikong",
  "afang-soup",
  "oha-soup",
  "bitterleaf-soup",
  "okra-soup",
  "vegetable-soup",
  "banga-soup",
  "groundnut-soup",
  "white-soup",
  "ora-soup",
  "owho-soup",
  "native-soup",
  "ofe-owerri",
  "okazi-soup",
  "editan-soup",
  "atama-soup",
  "miyan-kuka",
  "miyan-taushe",
  "miyan-kubewa",
];

/** Beans plates: a legume base with something eaten alongside it. */
const BEANS_BASES = ["cooked-beans", "beans-porridge"];
const BEANS_PARTNERS = ["fish", "chicken", "eggs", "smoked-fish", "beef"];

/**
 * Real Nigerian breakfasts, written out one by one. Light, quick, and the kind
 * of thing that actually goes on a table in the morning.
 */
const BREAKFAST: string[][] = [
  ["oats", "plain-yogurt"],
  ["oats", "groundnut"],
  ["oats", "soy-milk"],
  ["moi-moi", "tea-coffee"],
  ["moi-moi", "soy-milk"],
  ["moi-moi", "eggs"],
  ["okpa", "tea-coffee"],
  ["okpa", "soy-milk"],
  ["ekuru", "pepper-sauce"],
  ["eggs", "avocado"],
  ["eggs", "tea-coffee"],
  ["scrambled-egg", "avocado"],
  ["omelette", "tea-coffee"],
  ["beans-porridge", "eggs"],
  ["beans-porridge", "fish"],
  ["cooked-beans", "eggs"],
  ["dan-wake", "tea-coffee"],
  ["wara", "pepper-sauce"],
  ["plain-yogurt", "groundnut"],
  ["egg-sauce", "avocado"],
];

/**
 * A soup-and-swallow plate for every green soup, each with a protein taken from
 * the whitelist. `shift` moves the protein along so lunch and dinner do not hand
 * back the same plates on the same day.
 */
function soupPlates(shift: number): string[][] {
  return SWALLOW_SOUPS.map((soup, i) => [
    "oat-swallow",
    soup,
    SOUP_PROTEINS[(i + shift) % SOUP_PROTEINS.length],
  ]);
}

/** Beans with something to eat it with, one plate per pairing. */
function beansPlates(partners: string[]): string[][] {
  return BEANS_BASES.flatMap((base) => partners.map((p) => [base, p]));
}

/** Pepper soup, eaten on its own in the evening. A real, light dinner. */
function pepperSoupPlates(): string[][] {
  return ["fish", "chicken", "goat-meat", "turkey"].map((p) => [
    "pepper-soup",
    p,
  ]);
}

const LUNCH: string[][] = [
  ...soupPlates(0),
  ...beansPlates(BEANS_PARTNERS),
  ["ukwa", "fish"],
];

/**
 * Dietitian rule: moderate-GI foods are fine at breakfast or lunch, but never
 * at dinner (low-GI only, so the last meal of the day carries the gentlest
 * overnight load). Checked against every food on the plate, not only the
 * starch — a moderate-GI soup or side is excluded too.
 */
function hasModerateGi(ids: string[]): boolean {
  return ids.some((id) => getFood(id)?.gi === "medium");
}

// Dinner leans lighter: pepper soup leads, the soup plates carry a different
// protein from lunch's, and the beans plates keep to the lighter partners.
const DINNER: string[][] = [
  ...pepperSoupPlates(),
  ...soupPlates(5),
  ...beansPlates(["fish", "eggs", "smoked-fish"]),
  ["ukwa", "smoked-fish"],
].filter((ids) => !hasModerateGi(ids));

const IDEAS: Record<NamedMeal, string[][]> = {
  breakfast: BREAKFAST,
  lunch: LUNCH,
  dinner: DINNER,
};

/** The raw plates, for the test script. */
export function ideasFor(meal: NamedMeal): string[][] {
  return IDEAS[meal];
}

/** The calorie total of a plate's ids (missing/renamed foods contribute 0). */
function planCaloriesOf(ids: string[]): number {
  return ids.reduce((s, id) => s + (getFood(id)?.calories ?? 0), 0);
}

/**
 * The single largest plate each meal category can serve, in calories — what
 * lib/tdee.ts's remainingMealCalorieTarget weights the per-meal split by, so
 * breakfast (structurally smaller) isn't assigned the same flat share as
 * lunch/dinner. This is a real portion-size ceiling, not a daily-target
 * ceiling — a target above what the 3 main meals can reach is closed instead
 * by suggestExtras() below, which sizes a real extra-food LIST to cover the
 * rest. Computed directly from IDEAS so this can never drift from the actual
 * meal-idea data — verified against data/foods.json in
 * scripts/calorie-ranking-test.ts.
 */
export const MEAL_MAX_CALORIES: Record<NamedMeal, number> = {
  breakfast: Math.max(...ideasFor("breakfast").map(planCaloriesOf)),
  lunch: Math.max(...ideasFor("lunch").map(planCaloriesOf)),
  dinner: Math.max(...ideasFor("dinner").map(planCaloriesOf)),
};

export interface MealIdea {
  foods: Food[];
  /** How to name each food cleanly on the card (no "Titus / Mackerel" lists). */
  names: string[];
  index: number;
  count: number;
  /** A protein in this plate scaled up to help close the meal's own
   *  calorie gap directly — only ever set by `planForDay` when a
   *  `calorieTargetForMeal` was given and `scaleMainProtein` found a real,
   *  safe amount to add. See that function's own doc. */
  scaledProtein?: ScaledProtein | null;
  /** A breakfast side (groundnut/avocado/plain yogurt/soy milk) scaled up
   *  the same way, for whatever of the meal's calorie gap is still left
   *  after `scaledProtein` — see `scaleMainSide`'s own doc. Only ever set
   *  by `planForDay` under the same conditions as `scaledProtein`. */
  scaledSide?: ScaledPortion | null;
}

function resolve(meal: NamedMeal, index: number): MealIdea {
  const list = IDEAS[meal];
  const ids = list[index] ?? list[0];
  const foods = ids
    .map((id) => getFood(id))
    .filter((f): f is Food => Boolean(f));
  return {
    foods,
    names: foods.map((f) => cleanFoodName(f.name)),
    index,
    count: list.length,
  };
}

/**
 * The one true calorie total for a picked plate — its foods' own calories,
 * plus whatever `scaledProtein`/`scaledSide` added. Both
 * `lib/useTodaysCalories.ts` (sizing the extras gap) and
 * `components/TodaysMeal.tsx` (the kcal badge shown on the card) must use
 * this SAME function, never their own copy of the sum — two call sites
 * quietly diverging on how a plate's calories are totalled is the exact
 * class of bug already fixed once in this file's history (see CLAUDE.md's
 * "Portion/calorie review" section).
 */
export function mealIdeaCalories(idea: MealIdea): number {
  return (
    idea.foods.reduce((s, f) => s + (f.calories ?? 0), 0) +
    (idea.scaledProtein?.extraCalories ?? 0) +
    (idea.scaledSide?.extraCalories ?? 0)
  );
}

/** A small, stable hash so a day + an idea has one fixed pseudo-random order. */
function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** The whole-number day (in WAT, since dayKey is already a Nigerian date). */
function dayNumber(dayKey: string): number {
  return Math.floor(Date.parse(`${dayKey}T00:00:00Z`) / 86_400_000);
}

function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b);
}

/**
 * How far along the list one day moves.
 *
 * Stepping by 1 walks the list in order, so two people a day apart see the
 * neighbouring plate and a week looks like a run down a menu. Stepping by a
 * number that shares no factor with the list length still visits every plate
 * before repeating any, but jumps around while doing it.
 */
function stride(n: number): number {
  for (const s of [7, 5, 11, 3, 13, 2]) {
    if (s < n && gcd(s, n) === 1) return s;
  }
  return 1;
}

/**
 * The meal to show for a given day.
 *
 * Founder rules, all enforced here:
 *  - **It must change every day, and NEVER repeat day to day** ("avoid repeat at
 *    all cost"). The ideas are put in a stable order (freshest first, see below),
 *    then the DAY NUMBER steps along that order each day, so today and tomorrow
 *    can never be the same plate. `avoidIndexes` (the plates actually shown on
 *    the last few days, remembered on the device) is a second guard: if the step
 *    lands on one of them, we move on.
 *  - **It learns from what the person eats.** The stable order puts the ideas
 *    whose foods appear LEAST in their log first, so their usual plates drift to
 *    the back of the rotation. `liked` (foods they logged that came out GREEN)
 *    pulls a plate slightly back forward, so variety does not mean handing
 *    somebody food they have shown they do not want.
 *  - `offset` steps further for a "try another meal" tap.
 *  - `avoidIndexes` are plates not to land on: the last few days' plates, and
 *    the ones this person just pressed past. Both come from the device.
 *
 * Note what is NOT here: neither signal reshuffles the order from one day to the
 * next. `counts` and `liked` only move when the person logs a meal, and a skip
 * is handled as an avoid rather than a re-score. If either changed the order
 * daily, the stride could walk onto yesterday's plate, and the no-repeat rule is
 * the one that must not break.
 *
 * `bias` (Plus/Dietitian tier, and previewed during the 7-day trial) is an
 * optional GOAL/ACTIVITY tiebreak on top of the same stable order — see
 * lib/personalization.ts. It never changes which plates are eligible (every
 * idea here is already GREEN by construction) and it never touches the
 * no-repeat stride below; it only nudges the ORDER a little further, the same
 * way `liked` already does. Omitting it (the default) reproduces today's
 * behaviour exactly.
 *
 * `conditions` (free on every tier, same as the health-condition part of
 * `bias`) is the one thing here that is NOT just a reorder: when the person
 * has flagged hypertension, high cholesterol or kidney disease, any idea
 * whose protein carries its own comorbidity healthNote
 * (`CONDITION_EXCLUDED_PROTEIN_IDS`: beef, goat meat, pomo, shaki, stockfish,
 * smoked fish) is dropped from the rotation pool before scoring, rather than
 * merely nudged down the order — see `excludesRiskyProtein` above for why
 * this is a hard exclusion and not a bias. Falls back to the unfiltered pool
 * if that would ever empty it (it does not today — fish, chicken, turkey
 * and snail all carry no healthNote and stay eligible). Omitting it (the
 * default, an empty array) reproduces today's behaviour exactly.
 *
 * `calorieTargetForMeal` (Plus/Dietitian tier, same gate as `bias`) works
 * differently from `bias`, on purpose: a plain scoring tiebreak was tried
 * first and did not work, because the day-stride below walks every position
 * in the sorted list over the month regardless of score, so a small nudge to
 * the order barely changed which plate a person actually got on a given day
 * — confirmed as a real bug (a person's 3 meals came nowhere near their daily
 * target). Instead, when a target is given, the ROTATION POOL itself is
 * narrowed first to the plates whose `calories` are closest to this meal's
 * share of the target (relative to the single best match available, so it
 * still narrows sensibly even when every plate falls short of a high
 * target), with a floor on how small that pool may get so real variety
 * survives. Least-eaten-first, the goal bias, and the day-stride/avoid-list
 * machinery then all run exactly as before, just over that narrower pool —
 * every existing guarantee (green-only, no-repeat, avoidIndexes respected)
 * still holds, only the SET of plates being rotated through changes.
 * Omitting it (the default) reproduces today's behaviour exactly.
 *
 * `personalKey` (added 2026-09-08, same gate as `bias`) fixes a real, direct
 * report: two different people, with genuinely different weight/goals/
 * activity, were getting the exact SAME plate on the same day — and the
 * SAME person, after changing their own weight, still got the same plate
 * too. Root cause, confirmed with real numbers: `pos` below was a function
 * of the DAY ONLY (`dayNumber(dayKey) * step + offset`) — `bias` only
 * reorders the pool's SORT ORDER, and for a narrow pool (especially once
 * `calorieTargetForMeal` has already trimmed it down) two different bias
 * vectors often produce the same RELATIVE ordering even though their
 * absolute scores differ, so the same fixed day-position can land on the
 * same entry for very different people. `personalKey` is a plain string the
 * caller builds from the person's own saved profile (sex/age/weight/height/
 * activity/goals/conditions — see `components/TodaysMeal.tsx` and
 * `lib/useTodaysCalories.ts`) and is folded into `pos` as an additive salt,
 * the same mechanism `offset` already uses for "try another meal": it never
 * changes the sort order or the pool membership (so green-only, the
 * calorie-target narrowing, and avoidIndexes are all untouched), it only
 * shifts WHICH position in that same ranked list this person's day lands on
 * — the stride-coprime property that guarantees full-cycle coverage before
 * any repeat holds for any additive constant, so a person's own no-repeat
 * guarantee is unaffected, and changing ANY saved detail (weight, a goal,
 * activity) changes their salt and therefore their plate, immediately.
 * Omitting it (the default, `""`) reproduces today's behaviour exactly —
 * `hash("")` is never computed, so this is a true no-op for every existing
 * caller (`scripts/meal-ideas-test.ts`, `scripts/goal-ranking-test.ts`,
 * `scripts/calorie-ranking-test.ts`) that does not pass it.
 */
export function planForDay(
  meal: NamedMeal,
  dayKey: string,
  counts: Map<string, number>,
  offset = 0,
  avoidIndexes: number[] = [],
  liked: Map<string, number> = new Map(),
  bias: PlateAxes | null = null,
  calorieTargetForMeal: number | null = null,
  conditions: Condition[] = [],
  personalKey = "",
): MealIdea {
  const list = IDEAS[meal];
  const n = list.length;
  if (n === 0) return { foods: [], names: [], index: 0, count: 0 };

  // Stable order: least-eaten first, ties broken by a fixed per-idea hash (NOT
  // day-dependent, so the order only shifts when the person's eating changes).
  // A food they logged as green counts for a little less, so a plate they like
  // and that is good for them does not drift all the way to the back. A goal
  // bias, when present, nudges the same score by a bounded amount.
  const LIKED_DISCOUNT = 0.5;
  const GOAL_BIAS_WEIGHT = 2;
  const scored = list.map((_, i) => {
    const idea = resolve(meal, i);
    const eaten = idea.foods.reduce(
      (sum, f) =>
        sum +
        (counts.get(f.name) ?? 0) -
        LIKED_DISCOUNT * (liked.get(f.name) ?? 0),
      0,
    );
    const goalAdjust = bias ? GOAL_BIAS_WEIGHT * biasScore(idea.foods, bias) : 0;
    const planCalories = planCaloriesOf(list[i]);
    // `diff` defaults to 0 here (no target given) so the pool has a uniform
    // shape whether or not the calorie-target narrowing below runs, and the
    // final sort's `diff` tiebreak (see below) is a no-op in that case.
    return { idea, eaten: eaten + goalAdjust, tie: hash(`${meal}#${i}`), planCalories, diff: 0 };
  });

  // A hard exclusion, not a reorder (see `excludesRiskyProtein` above): drop
  // any idea whose protein is one that food's own `healthNote` already warns
  // this person about. Falls back to the unfiltered list if this would ever
  // empty it, so a rare edge case can never leave nothing to serve.
  let base = scored;
  if (excludesRiskyProtein(conditions)) {
    const safe = scored.filter(
      (s) => !s.idea.foods.some((f) => CONDITION_EXCLUDED_PROTEIN_IDS.has(f.id)),
    );
    if (safe.length > 0) base = safe;
  }

  // A calorie target (Plus/Dietitian tier) is NOT a minor tiebreak added on
  // top of the full list — a tiebreak this small was getting lost entirely,
  // because the day-stride below walks every position in the sorted list
  // over time regardless of score, so on any given day the "closest match"
  // was barely more likely to be served than a distant one. Instead, narrow
  // the ROTATION POOL itself to the closest-matching plates first, then let
  // the existing least-eaten/goal-bias order and day-stride work exactly as
  // before, but only within that narrower pool. This keeps every existing
  // guarantee (still green, still no-repeat, still respects avoidIndexes) —
  // it only changes WHICH plates are in rotation, never how rotation works.
  let pool = base;
  if (calorieTargetForMeal && calorieTargetForMeal > 0) {
    const withDiff = base.map((s) => ({
      ...s,
      diff: Math.abs(s.planCalories - calorieTargetForMeal),
    }));
    const bestDiff = Math.min(...withDiff.map((s) => s.diff));
    // Anything within 15% of the target, OR within a stone's throw of the
    // single best match — relative to the BEST match, not the target itself,
    // so this still narrows correctly to "closest available" when the target
    // is above every plate's reach (a big, active, or muscle-building
    // person), rather than falling through to the full, mostly-irrelevant
    // list.
    const band = Math.max(calorieTargetForMeal * 0.15, bestDiff + 40);
    const close = withDiff.filter((s) => s.diff <= band);
    // Keep enough plates in rotation for real variety (never fewer than the
    // closest handful) even when the band above is stricter than that.
    const MIN_POOL = Math.min(6, base.length);
    pool =
      close.length >= MIN_POOL
        ? close
        : [...withDiff].sort((a, b) => a.diff - b.diff).slice(0, MIN_POOL);
  }

  // `eaten` (least-eaten-first, the variety/no-repeat guarantee) stays the
  // primary key, unchanged. `diff` (distance from this meal's calorie
  // target) is a new secondary key, ahead of the fixed hash tiebreak: when
  // several pool members tie on `eaten` — common, since most of a narrowed
  // pool hasn't been eaten recently — this biases toward the plate closest
  // to target rather than picking arbitrarily among them, which is what
  // actually closes the calorie gap rather than merely making it eligible.
  pool.sort((a, b) => a.eaten - b.eaten || a.diff - b.diff || a.tie - b.tie);

  const m = pool.length;
  const step = stride(m);
  // Deliberately NOT folding `meal` into this salt (unlike suggestExtras()'s
  // dayStart below, where it fixes a real, directly reported bug): breakfast,
  // lunch and dinner already draw from entirely different IDEAS lists, so
  // this position landing on the same relative slot never produces the same
  // food — there is no real symptom here to fix, and doing it anyway would
  // change `pos` unconditionally for every existing caller (including the
  // ones with no personalKey), breaking the "omitting personalKey reproduces
  // today's behaviour exactly" promise this parameter was built to keep.
  const salt = personalKey ? hash(personalKey) : 0;
  let pos = (((dayNumber(dayKey) * step + offset + salt) % m) + m) % m;
  if (avoidIndexes.length > 0 && m > avoidIndexes.length) {
    let guard = 0;
    while (avoidIndexes.includes(pool[pos].idea.index) && guard < m) {
      pos = (pos + 1) % m;
      guard += 1;
    }
  }
  const picked = pool[pos].idea;
  // Try to close part of this meal's own calorie gap directly within the
  // plate (a bigger, still-safe protein serving, then a bigger breakfast
  // side for whatever is still left) BEFORE extras — see scaleMainProtein's
  // and scaleMainSide's own docs for the safety reasoning and ceilings. Only
  // when a real target was given; null for every existing caller that omits
  // calorieTargetForMeal, which is the exact "omitting it reproduces
  // today's behaviour exactly" promise this whole feature is built on.
  // scaleMainSide runs against the RESIDUAL gap left after scaleMainProtein
  // so the two can never double-count the same shortfall — in practice they
  // never both find a match on the same plate today (the 5 scalable
  // proteins and the 4 scalable sides never appear together in one plate),
  // but the residual composition is correct either way, and safe if that
  // ever changes.
  if (calorieTargetForMeal && calorieTargetForMeal > 0) {
    const gap = Math.max(0, calorieTargetForMeal - pool[pos].planCalories);
    picked.scaledProtein = scaleMainProtein(picked.foods, gap, conditions);
    const residualGap = Math.max(0, gap - (picked.scaledProtein?.extraCalories ?? 0));
    picked.scaledSide = scaleMainSide(picked.foods, residualGap, conditions);
  }
  return picked;
}

/**
 * A small, safe way to close the daily calorie gap — this is what makes
 * "calories remaining" reach exactly 0 by end of dinner for a realistic
 * target, no matter how large (founder instruction, 2026-08-31: "glufloat
 * must always meet the calorie needs of each user no matter the value... it
 * must not be capped" / "all recommended meals must add up at the end of the
 * day to meet each user calorie goals"). `lib/tdee.ts`'s `calorieTarget()` is
 * never capped, so the achievability guarantee lives here — but the SUPPLY
 * side is honestly bounded by how much of a real, safe snack a person can
 * actually eat at once (see `EXTRA_CANDIDATES` below), never by an arbitrary
 * ceiling on the target itself.
 *
 * **Redesigned 2026-08-31** after live QA on the extras card surfaced three
 * problems with the earlier fixed-preset design, and direct follow-up
 * instructions on how to fix them:
 *  1. "Try a different snack" only reshuffled the ORDER of the same 2-3
 *     fixed combos, so once a gap needed more than one item every option
 *     converged on an identical grouped result — clicking visibly did
 *     nothing. Root-caused directly against the code, not guessed.
 *  2. The old design repeated ONE small fixed serving to reach a bigger
 *     number ("Egusi × 2 ... that is this size, 2 times today"), which reads
 *     badly. Reversed on direct instruction: "do not be scared to increase
 *     the quantity they need to eat ... just ensure you do your research and
 *     be sure it is safe."
 *  3. The fixed presets could only get within a sanity-guard's worth of an
 *     arbitrary number, never exactly on it.
 *
 * The fix: each food is a CONTINUOUSLY SCALABLE real serving (a whole,
 * countable number of nuts/tablespoons/pieces — never a fraction), sized to
 * land exactly on the calorie gap, capped at a per-food SAFE MAXIMUM
 * single-sitting amount (`EXTRA_CANDIDATES.maxGrams`, researched and
 * documented in docs/EVIDENCE.md's extras section, pending dietitian
 * sign-off same as the weekly-frequency numbers). **A food is never repeated
 * within one recommendation** — if one food's safe maximum can't cover the
 * whole gap, the NEXT, DIFFERENT food in the pool closes the rest. This is
 * what makes "eat it once" and "hit the exact number" both true together.
 *
 * **Every candidate must be eaten AS IS, with no cooking step at snack
 * time** (direct instruction, 2026-09-01: "all snacks must be something
 * that must be consumed without cooking"). `fried-egg` (frying) and
 * `egusi-seed` (the melon seed is normally cooked into soup or actively
 * roasted, not bought ready-to-eat the way nuts are) were both dropped for
 * this reason — every remaining candidate is a nut, seed, spread, or
 * already-grilled meat a person can eat straight from the pack.
 *
 * **Only 2 choices per meal-time, not 3** (reversed from the earlier design
 * on direct instruction: "it is better to have 1-2 extras card each time of
 * the day because having 3 ... can be overwhelming"). "Try a different
 * snack" toggles between 2 genuinely different foods — verified by
 * scripts/calorie-ranking-test.ts, not just asserted.
 *
 * **Every food here is picked so it never also appears in BREAKFAST, LUNCH or
 * DINNER above**, and this is now enforced at RUNTIME (`EXCLUDED_FROM_EXTRAS`
 * below), not only by the two lists happening to be kept separate by hand. A
 * food cannot be both "your meal" and "something extra on the side" in the
 * same app — that is why eggs, fish, chicken, smoked fish, stockfish and
 * groundnut, which all show up in the meal templates, were dropped from this
 * list even though they used to be here.
 *
 * **Candidates are grouped by meal**, not one shared pool for the whole day,
 * so whatever shows during breakfast is something that actually belongs at
 * breakfast, and the same for lunch and dinner.
 */
interface ExtraCandidate {
  id: string;
  /**
   * Whether this food's serving may be scaled up past its base amount. Every
   * current candidate is scalable; the flag is kept for a future food whose
   * quantity should stay fixed regardless of the calorie gap (a past example
   * was egg count, capped for reasons unrelated to calories).
   */
  scalable: boolean;
  /** Whole real units the base serving is already described in. */
  baseUnits: number;
  /** The gram anchor for that base serving (matches the food's own portionGuidance). */
  baseGrams: number;
  /**
   * The safe single-sitting ceiling in grams. Nuts, seeds and nut butter use
   * roughly double the base serving (about 1-2oz / 28-56g is the standard
   * safe nut/seed range); coconut is kept to 1.5x for its higher saturated
   * fat; suya (lean grilled meat) allows "one or two sticks". Sourced and
   * documented in docs/EVIDENCE.md.
   */
  maxGrams: number;
  /** The exact line shown for a given (units, grams) — always a whole real amount. */
  describe: (units: number, grams: number) => string;
}

/**
 * Every candidate here must clear FOUR bars, all direct instructions from
 * live QA on 2026-09-01:
 *  1. **Ready to eat as is, no cooking step at snack time** — `fried-egg`
 *     (frying) and `egusi-seed` (normally cooked into soup, or actively
 *     roasted) were removed.
 *  2. **Genuinely edible alone, by a person, with nothing added** — a
 *     narrower bar than #1: dry chia or flax seed, for instance, is not
 *     something eaten by the spoonful on its own (it is a soak-in-liquid or
 *     stir-into-food ingredient). This is WHY the multi-type "Seeds
 *     (pumpkin, sunflower, flax, chia)" entry was removed, not only because
 *     it named several kinds at once.
 *  3. **One specific, single, real food — never a blended category**
 *     ("is there any nut called mixed nuts?" / "what does mixed seeds
 *     mean? ... be specific with names of snacks"). "Mixed Nuts" was
 *     removed for this reason.
 *  4. **Easy to find in a Nigerian market, and cheap** ("only include
 *     snack that is edible, easy to find in the nigerian market and
 *     economically friendly"). `almond` was removed here — a real, safe,
 *     edible nut, but an imported supermarket item next to the others,
 *     which are all cheap, everyday market/roadside foods (the African
 *     walnut here is `asala`/`ukpa`, not the imported English walnut).
 *
 * All 4 bars were re-applied on the same day to widen the pool past the
 * first 6 survivors ("are these the only 7 snacks you could come up with?
 * ... find more edible and enjoyable snacks"), adding `bitter-kola` (chewed
 * raw, "every day" frequency, cheap and everywhere).
 *
 * **A fifth bar was added 2026-09-06, and it removed two foods that had
 * cleared the original four**: no candidate may be a PROCESSED meat,
 * following a reviewing dietitian's direct feedback ("suya is a highly
 * processed meat... you cannot recommend suya for somebody that is having
 * diabetes"). This is independent of blood sugar (suya and dambu nama are
 * both genuinely low-GI, meat-only foods) — processed meat carries its own,
 * separately established cardiovascular/type-2-diabetes risk regardless of
 * its glycaemic effect, which the GI-only verdict engine was never built to
 * weigh. `suya` (grilled but salted and cured in a spice/oil rub) and
 * `dambu-nama` (dried, salted, shredded beef) both fail this bar and were
 * removed entirely — not condition-gated, since the concern applies to
 * every person managing diabetes, not only those with a specific
 * comorbidity flagged (contrast with `CONDITION_EXCLUDED_PROTEIN_IDS`
 * above: organ/red meat and high-salt dried fish are all fine for blood
 * sugar, and stay offered by default, only excluded for the specific
 * conditions their own healthNote already names). `docs/EVIDENCE.md` §9
 * covers the research behind the remaining candidates and should be
 * updated with this removal if it is revisited.
 *
 * The rest of the "already considered and rejected" list, worth keeping:
 * `groundnut`, `plain-yogurt`, `soy-milk`, `avocado` are all real no-cook
 * snacks but already used inside a BREAKFAST plate above, so the
 * "never both a meal and an extra" rule excludes them; `ube` (African pear)
 * needs its own "softened" heating step, same as `egusi-seed`; `kola-nut`
 * and every green FRUIT (apple, guava, avocado, etc.) carry their own
 * weekly cap (not "every day"), so using them here would silently
 * contradict what their own card already says elsewhere in the app;
 * `sesame-seed` shares egusi's problem — its own pairing text says it is
 * "stirred into soups", not eaten alone.
 *
 * Nuts, nut butter and meat are not tied to a time of day the way a soup or
 * a swallow is, so the SAME pool is offered at every meal-time rather than
 * an arbitrary, thinner split per meal — more real foods in the pool also
 * means more genuine variety for "Try a different snack" and a better
 * chance of landing exactly on the calorie gap.
 */
const READY_TO_EAT_EXTRAS: ExtraCandidate[] = [
  {
    id: "walnut",
    scalable: true,
    baseUnits: 7,
    baseGrams: 30,
    maxGrams: 60,
    describe: (units, grams) => `About ${units} whole walnuts (${grams}g).`,
  },
  {
    id: "cashew-nut",
    scalable: true,
    baseUnits: 15,
    baseGrams: 30,
    maxGrams: 60,
    describe: (units, grams) => `About ${units} cashew nuts (${grams}g).`,
  },
  {
    id: "tiger-nut",
    scalable: true,
    baseUnits: 20,
    baseGrams: 30,
    maxGrams: 60,
    describe: (units, grams) => `About ${units} tiger nuts (${grams}g).`,
  },
  {
    id: "coconut",
    scalable: true,
    baseUnits: 3,
    baseGrams: 40,
    maxGrams: 60,
    describe: (units, grams) => `About ${units} small pieces (about ${grams}g).`,
  },
  {
    id: "peanut-butter",
    scalable: true,
    baseUnits: 1,
    baseGrams: 15,
    // Widened from 30g (2 tbsp) to 45g (3 tbsp) 2026-09-08, the one candidate
    // with genuine evidence-backed headroom — see docs/EVIDENCE.md §9 for why
    // the nut/seed candidates were checked and left unchanged (60g already
    // sits at a well-documented "large handful" figure, and the ADA exchange
    // list's own nut servings are far smaller than what this pool already
    // offers, so there was no honest basis to raise them further).
    maxGrams: 45,
    describe: (units, grams) => `About ${units} tablespoon${units === 1 ? "" : "s"} (about ${grams}g).`,
  },
  {
    id: "bitter-kola",
    scalable: true,
    baseUnits: 2,
    baseGrams: 15,
    maxGrams: 22,
    describe: (units, grams) => `About ${units} seeds (about ${grams}g).`,
  },
];

const EXTRA_CANDIDATES: Record<NamedMeal, ExtraCandidate[]> = {
  breakfast: READY_TO_EAT_EXTRAS,
  lunch: READY_TO_EAT_EXTRAS,
  dinner: READY_TO_EAT_EXTRAS,
};

/**
 * The real runtime guard: no candidate id may ever be one that also appears
 * in a breakfast/lunch/dinner meal-idea plate. Computed once from `IDEAS`
 * itself, so it can never drift out of step with the meal templates above.
 */
const EXCLUDED_FROM_EXTRAS = new Set(Object.values(IDEAS).flat().flat());

/** Nuts sit ahead of whichever meal they are shown next to. */
const PRE_MEAL_NUTS = new Set([
  "walnut",
  "cashew-nut",
  "tiger-nut",
  "coconut",
  "peanut-butter",
  "bitter-kola",
]);

const MEAL_WORD: Record<NamedMeal, string> = {
  breakfast: "breakfast",
  lunch: "lunch",
  dinner: "dinner",
};

/**
 * WHEN to eat each extra, not just what and how much.
 *
 * Nuts, seeds and nut butters are fat and body-building food with almost no
 * starch. Research on eating something fatty or body-building shortly ahead
 * of a carbohydrate meal (whey and nut "preload" studies) shows it slows the
 * stomach down, so the meal that follows pushes sugar up more slowly than it
 * would on its own — the same reason GluFloat always pairs a starch with
 * vegetables and body-building food, used here ahead of time instead of
 * alongside. Studies test this in a 15-to-30-minute window before the meal,
 * which is why the copy gives that range. Because each option now sits
 * inside its OWN meal's set, "your next meal" is named directly — a walnut
 * shown at breakfast says "before your breakfast", the same walnut idea
 * shown at dinner would say "before your dinner".
 *
 * Every line avoids the house-banned words (`COPYWRITING-PLAYBOOK.md` §0.1),
 * same as every other card: no "spike", no "protein", no "portion" — see
 * scripts/plain-words.mjs's audit list.
 *
 * Every remaining candidate is one of the pre-meal nuts/seeds/spread in
 * `PRE_MEAL_NUTS`, so that is the only branch left here since `suya` and
 * `dambu-nama` (the two candidates that used to need their own fixed
 * "eat this any time" line) were removed entirely — see the processed-meat
 * bar above `READY_TO_EAT_EXTRAS`.
 */
export function extraTimingFor(id: string, meal: NamedMeal): string {
  if (PRE_MEAL_NUTS.has(id)) {
    return `Eat this 15 to 30 minutes before your ${MEAL_WORD[meal]}. It slows down how fast that meal pushes your sugar up.`;
  }
  return "";
}

/** One real, exactly-sized serving of one food. */
export interface ExtraOption {
  food: Food;
  name: string;
  units: number;
  grams: number;
  calories: number;
  instruction: string;
}

/**
 * One real, complete way to close THIS meal's gap — every item in it is a
 * DIFFERENT food (never a repeat), together summing to (about) the gap it
 * was built for. A person eats everything in ONE variant, not a
 * pick-one-food-from-here-and-there mix across variants.
 */
export interface ExtraVariant {
  items: ExtraOption[];
  totalCalories: number;
  /**
   * How many of `items`, counting from the start, are the typical 1-2
   * shown by default (`MAX_EXTRA_ITEMS`). Any further items are an
   * automatic top-up added only because the typical set could not close
   * the day's real calorie gap on its own — see `buildVariant()`. The UI
   * groups the display around this so a big-gap day still reads as
   * "your usual pick, plus a bit more to fully meet today's number" rather
   * than one undifferentiated pile.
   */
  coreCount: number;
}

export interface ExtraSuggestionSet {
  meal: NamedMeal;
  /**
   * 2 real, independently-complete ways to close this meal's gap. Each
   * variant on its own already sums to this meal's own fair share of the
   * day's target, so whichever ONE a person picks and eats, the day's
   * numbers still add up to the full calorie goal. This is what "Try a
   * different snack" cycles between: the whole variant swaps, never one
   * item within it.
   */
  variants: ExtraVariant[];
}

/** How small a leftover gap has to be before there is nothing worth suggesting. */
const MIN_GAP_KCAL = 100;

/** Below this, adding one more whole real serving is not worth the overshoot. */
const MIN_ADD_KCAL = 20;

/**
 * The TYPICAL number of distinct real foods a variant shows as its normal
 * set — 2, per direct instruction 2026-09-01 ("3 extra snacks in each green
 * card ... can be overwhelming for users" / "1-2 extras card to meet
 * calorie intake daily is required not 3"). This governs `coreCount` (see
 * `ExtraVariant`) and how `components/ExtraSuggestionCard.tsx` groups the
 * display — it is NOT a hard stop on `buildVariant()` any more.
 *
 * **Changed 2026-09-08, direct instruction: "do what is best to always
 * ensure they meet the calorie intake daily", automated, with no referral
 * out** (a person reported the exact same meal AND extras across a normal-
 * weight and an obese profile; traced to, among other things, extras
 * hitting this 2-item stop identically in both cases even though their real
 * gaps genuinely differed). A first attempt at "always meet the goal"
 * showed a plain honest-shortfall message instead ("ask your dietitian") —
 * rejected on the same instruction: GluFloat is meant to run automated,
 * and a human referral is reserved for the paid dietitian-chat tier, not a
 * stand-in for the app's own job. So `buildVariant()` now keeps adding
 * more DISTINCT real foods, each still capped at its own researched safe
 * maximum (`docs/EVIDENCE.md` §9), past this typical count, for as long as
 * a real gap remains and the pool has an unused candidate left — up to the
 * WHOLE pool (6 foods today, `READY_TO_EAT_EXTRAS`), which is enough to
 * close nearly every realistic gap this file has been asked about (a
 * measured worked example: 1,488kcal available across all 6 candidates at
 * their own safe max, against a measured worst-case single-meal gap of
 * 1,497-2,040kcal). In the common case (most real gaps, per
 * scripts/calorie-ranking-test.ts's full-day walk) this closes within the
 * same 1-2 items as before — nothing changes there. A food is still NEVER
 * repeated within one variant.
 *
 * **Tightened 2026-09-08 (later the same day), direct founder instruction,
 * non-negotiable: "keep extras to less than 2 and preferably nothing...
 * as long as it is safe based on thorough research about the blue card
 * meals recommendations."** Two changes came out of that instruction, both
 * upstream of this constant: `scaleMainProtein` and the new `scaleMainSide`
 * now close a meaningful part of a meal's gap from the PLATE itself before
 * extras are even considered (see their own docs), and `buildVariant` below
 * was rewritten to actively search for the FEWEST items that get close
 * enough, rather than greedily accumulating from a fixed rotation start —
 * the greedy top-up described above is now the rare fallback for a gap a
 * safe 1-or-2-item combination genuinely cannot reach, not the everyday
 * path. `MAX_EXTRA_ITEMS` itself is unchanged (2 was already the right
 * number); what changed is that the algorithm now actually tries to stay
 * at or under it instead of treating it as a soft label.
 */
export const MAX_EXTRA_ITEMS = 2;

/**
 * One whole real serving of `candidate`, scaled to land as close as possible
 * to `targetKcal` without exceeding its own safe maximum. Never a fraction —
 * always a whole countable unit (nuts, tablespoons, pieces). A non-scalable
 * candidate always returns its fixed base serving instead (see the
 * `scalable` field's own doc).
 */
function sizeExtra(candidate: ExtraCandidate, food: Food, targetKcal: number): ExtraOption {
  const baseKcal = food.calories ?? 0;
  if (!candidate.scalable) {
    return {
      food,
      name: cleanFoodName(food.name),
      units: candidate.baseUnits,
      grams: candidate.baseGrams,
      calories: baseKcal,
      instruction: candidate.describe(candidate.baseUnits, candidate.baseGrams),
    };
  }
  const kcalPerUnit = baseKcal / candidate.baseUnits;
  const gramsPerUnit = candidate.baseGrams / candidate.baseUnits;
  const maxUnits = Math.max(candidate.baseUnits, Math.round(candidate.maxGrams / gramsPerUnit));
  const cappedTarget = Math.min(targetKcal, maxUnits * kcalPerUnit);
  const units = Math.max(1, Math.min(maxUnits, Math.round(cappedTarget / kcalPerUnit)));
  const grams = Math.round(units * gramsPerUnit);
  const calories = Math.round(units * kcalPerUnit);
  return { food, name: cleanFoodName(food.name), units, grams, calories, instruction: candidate.describe(units, grams) };
}

/**
 * How close (in kcal) a combination must land to `targetKcal` to count as
 * "close enough" without needing a further item. Scales with the size of
 * the gap (whole-unit rounding noise is proportionally bigger for a small
 * ask than a large one) but never drops below a flat floor. `0.12` was
 * picked to match the ±60kcal tolerance already proven workable for a
 * typical 500kcal gap (`scripts/calorie-ranking-test.ts`).
 */
function acceptableDiff(targetKcal: number): number {
  return Math.max(40, targetKcal * 0.12);
}

/**
 * Looks for the SMALLEST number of distinct foods (1, then 2) from `pool`
 * that lands within `acceptableDiff` of `targetKcal` — direct founder
 * instruction, non-negotiable: "keep extras to less than 2 and preferably
 * nothing." Walks the pool in rotation order starting at `startIdx` so
 * which food(s) lead still varies day to day and meal to meal, but a
 * candidate further round the rotation is only ever tried after every
 * closer-to-`startIdx` single-item option has been checked, so rotation
 * never costs an extra item when a 1-item answer was available somewhere in
 * the pool. Returns null if no 1-or-2-item combination gets close enough;
 * the caller then falls back to `greedyClose` for a gap only a genuinely
 * large, multi-item combination can reach.
 */
function bestSmallCombo(
  pool: { candidate: ExtraCandidate; food: Food }[],
  startIdx: number,
  targetKcal: number,
): ExtraOption[] | null {
  const n = pool.length;
  const margin = acceptableDiff(targetKcal);

  for (let step = 0; step < n; step++) {
    const i = (startIdx + step) % n;
    const sized = sizeExtra(pool[i].candidate, pool[i].food, targetKcal);
    if (Math.abs(sized.calories - targetKcal) <= margin) return [sized];
  }

  for (let step = 0; step < n; step++) {
    const i = (startIdx + step) % n;
    const sizedFirst = sizeExtra(pool[i].candidate, pool[i].food, targetKcal);
    const left = targetKcal - sizedFirst.calories;
    if (left < MIN_ADD_KCAL) continue;
    for (let j = 0; j < n; j++) {
      if (j === i) continue;
      const sizedSecond = sizeExtra(pool[j].candidate, pool[j].food, left);
      const total = sizedFirst.calories + sizedSecond.calories;
      if (Math.abs(total - targetKcal) <= margin) return [sizedFirst, sizedSecond];
    }
  }
  return null;
}

/**
 * The exhaustive fallback for a gap no 1-or-2-item combination can safely
 * reach: keeps adding the next best-fit, never-repeated food from `pool`
 * until the gap closes or the pool runs out. This is now the RARE path —
 * see `MAX_EXTRA_ITEMS`'s own doc — reserved for a genuinely demanding
 * target `bestSmallCombo` truly cannot reach.
 */
function greedyClose(
  pool: { candidate: ExtraCandidate; food: Food }[],
  startIdx: number,
  targetKcal: number,
): ExtraOption[] {
  const n = pool.length;
  const first = pool[startIdx];
  const sizedFirst = sizeExtra(first.candidate, first.food, targetKcal);
  const items: ExtraOption[] = [sizedFirst];
  const used = new Set<number>([startIdx]);
  let left = targetKcal - sizedFirst.calories;

  while (left >= MIN_ADD_KCAL && used.size < n) {
    let best: ExtraOption | null = null;
    let bestIdx = -1;
    let bestDiff = Infinity;
    for (let i = 0; i < n; i++) {
      if (used.has(i)) continue;
      const { candidate, food } = pool[i];
      const sized = sizeExtra(candidate, food, left);
      const diff = Math.abs(sized.calories - left);
      if (diff < bestDiff) {
        bestDiff = diff;
        best = sized;
        bestIdx = i;
      }
    }
    if (!best) break;
    items.push(best);
    used.add(bestIdx);
    left -= best.calories;
  }
  return items;
}

/**
 * One real, complete way to close a meal's gap. Tries the FEWEST distinct
 * foods first (`bestSmallCombo`: 1 item, then 2), only reaching for more
 * (`greedyClose`) when no 1-or-2-item combination gets close enough — see
 * `MAX_EXTRA_ITEMS`'s own doc for why this order matters now (direct
 * founder instruction, non-negotiable: "keep extras to less than 2 and
 * preferably nothing"). Rotation (`startIdx`) still decides which food(s)
 * lead, so the same person is not shown an identical pick every day, but it
 * never overrides the fewest-items-first rule.
 *
 * Distinctness between the day's two variants is handled entirely by
 * `suggestExtras` retrying a DIFFERENT `startIdx` (never by excluding foods
 * outright) — an earlier version of this function took an `avoid` set to
 * exclude the first variant's foods from the second, which broke a real
 * case: once the first variant needs 3+ items to reach a large gap, only a
 * few foods are left to avoid INTO, and the second variant could no longer
 * independently reach anywhere near the same target. Retrying the starting
 * point instead lets the second variant draw on the FULL pool, same as the
 * first, while still landing on a genuinely different combination in the
 * common case.
 */
function buildVariant(
  pool: { candidate: ExtraCandidate; food: Food }[],
  startIdx: number,
  targetKcal: number,
): ExtraVariant {
  const items = bestSmallCombo(pool, startIdx, targetKcal) ?? greedyClose(pool, startIdx, targetKcal);
  return {
    items,
    totalCalories: items.reduce((s, o) => s + o.calories, 0),
    coreCount: Math.min(MAX_EXTRA_ITEMS, items.length),
  };
}

/**
 * Kidney disease caps daily protein at 0.6-0.8g/kg/day (lib/tdee.ts's
 * `proteinCapG`, NKF KDOQI guidance) — a real restriction, not a preference,
 * and for a small person that budget can be as tight as 30-40g for the WHOLE
 * day. A single scaled-up snack must never quietly eat deep into it. So for a
 * kidney_disease profile, any extra candidate carrying a meaningful amount of
 * protein in its OWN base serving (cashew nut, walnut, peanut butter — all at
 * or above this threshold; tiger nut, coconut and bitter kola sit well under
 * it) is capped at exactly its base serving here: it may never be scaled up
 * past the normal amount already shown on that food's own card, no matter how
 * large the calorie gap is. This can leave a kidney_disease profile's gap
 * honestly a little short on a demanding target — the same deliberate
 * trade-off already accepted for `MAX_EXTRA_ITEMS` above (a safety-driven cap
 * on the pool, not a bug to chase). It never blocks a food outright and never
 * shows a gram number to the person (the dietitian's rule that nobody sees a
 * remaining protein/carb/fat figure, only calories, is untouched) — it only
 * bounds how far one serving can scale.
 */
const PROTEIN_CAP_THRESHOLD_G = 3;

/** `candidate`, or a copy capped to its own base serving when a kidney_disease
 * profile should not be offered more than that food's normal amount. */
function guardedCandidate(candidate: ExtraCandidate, food: Food, capProtein: boolean): ExtraCandidate {
  if (!capProtein) return candidate;
  if ((food.proteinG ?? 0) < PROTEIN_CAP_THRESHOLD_G) return candidate;
  return { ...candidate, maxGrams: candidate.baseGrams };
}

/**
 * 2 real, swappable ways to close THIS meal's own share of today's calorie
 * gap — each one a real, exactly-sized, NEVER-repeated food (or two, only
 * when one food's safe maximum is not enough on its own). Which pair of
 * foods leads is rotated by day, so a returning person does not always see
 * the same one; "Try a different snack" then swaps to the other within a
 * visit. Returns null below a small threshold (100kcal) or once nothing in
 * the pool can be resolved (a food renamed or removed — should not happen,
 * never throws).
 *
 * `conditions` (optional, default none) is the same free-on-every-tier signal
 * `planForDay` already takes — see `guardedCandidate` above for what it does
 * here. Omitting it reproduces today's behaviour exactly.
 *
 * `personalKey` (optional, default `""`) is the same personal salt
 * `planForDay` takes (see its own doc) — folded into which candidate a
 * variant starts from, so two different people (or the same person after a
 * real profile change) do not always land on the same starting food purely
 * because they happened to check on the same day. Omitting it changes
 * nothing about this specific behaviour (see the next paragraph for what
 * DOES always change now).
 *
 * **`meal` is folded into the starting position too, unconditionally, since
 * 2026-09-08 — a real, directly reported bug: because `dayStart` used to
 * depend only on the day, the SAME food (e.g. "Walnut") was the first thing
 * recommended at breakfast, lunch AND dinner on the same day for the same
 * person, every time — the exact "too many of the same snack" complaint.**
 * Unlike `personalKey`, this is NOT behind a default-off parameter: it
 * changes `dayStart` for every caller, including ones that pass no
 * `personalKey`, because the bug itself had nothing to do with
 * personalization — it hit anyone seeing extras more than once a day. No
 * existing guarantee depends on the OLD specific day-to-food mapping (every
 * test here checks properties — variety across days, no repeats, safe
 * grams — never one exact food on one exact day), so this is safe to change
 * unconditionally.
 */
export function suggestExtras(
  remainingKcal: number,
  dayKey: string,
  meal: NamedMeal,
  conditions: Condition[] = [],
  personalKey = "",
): ExtraSuggestionSet | null {
  if (!remainingKcal || remainingKcal < MIN_GAP_KCAL) return null;
  const capProtein = conditions.includes("kidney_disease");
  const pool = EXTRA_CANDIDATES[meal]
    .filter((candidate) => !EXCLUDED_FROM_EXTRAS.has(candidate.id))
    .map((candidate) => ({ candidate, food: getFood(candidate.id) }))
    .filter((p): p is { candidate: ExtraCandidate; food: Food } => p.food != null)
    .map((p) => ({ candidate: guardedCandidate(p.candidate, p.food, capProtein), food: p.food }));
  if (pool.length === 0) return null;

  // At most 2 variants (fewer only if the pool itself is smaller). Which
  // food(s) lead rotates by day (dayNumber(dayKey) picks the starting
  // index), salted per-person the same way planForDay's `pos` is, AND
  // per-meal (hash(meal), unconditional — see this function's own doc for
  // the real bug this fixes: breakfast/lunch/dinner used to all start from
  // the same food on the same day).
  const n = pool.length;
  const salt = (personalKey ? hash(personalKey) : 0) + hash(meal);
  const dayStart = (((dayNumber(dayKey) + salt) % n) + n) % n;
  const numVariants = Math.min(2, n);
  const first = buildVariant(pool, dayStart, remainingKcal);
  const variants: ExtraVariant[] = [first];

  if (numVariants === 2) {
    const firstIds = compositionKey(first);
    // Walk forward through starting indices (never excluding foods
    // outright — see buildVariant's own doc for why) until the resulting
    // SET genuinely differs from the first variant's, so "Try a different
    // snack" always shows a real change whenever the pool has more than 2
    // foods to draw from. Falls back to the immediate next index (today's
    // old behaviour) only if every rotation truly converges — a pool of 2,
    // or a gap so large it needs the entire pool either way.
    let second = buildVariant(pool, (dayStart + 1) % n, remainingKcal);
    for (let step = 2; step <= n - 1 && compositionKey(second) === firstIds; step++) {
      second = buildVariant(pool, (dayStart + step) % n, remainingKcal);
    }
    variants.push(second);
  }
  return { meal, variants };
}

/** The set of food ids in a variant, order-independent, for a same/different check. */
function compositionKey(variant: ExtraVariant): string {
  return variant.items.map((o) => o.food.id).sort().join(",");
}
