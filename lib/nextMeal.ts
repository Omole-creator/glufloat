import { getFood } from "./search";
import type { Food } from "./types";
import type { NamedMeal } from "./mealtime";
import { cleanFoodName } from "./foodName";
import { biasScore, type PlateAxes } from "./personalization";

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
  let pool = scored;
  if (calorieTargetForMeal && calorieTargetForMeal > 0) {
    const withDiff = scored.map((s) => ({
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
    const MIN_POOL = Math.min(6, scored.length);
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
  let pos = (((dayNumber(dayKey) * step + offset) % m) + m) % m;
  if (avoidIndexes.length > 0 && m > avoidIndexes.length) {
    let guard = 0;
    while (avoidIndexes.includes(pool[pos].idea.index) && guard < m) {
      pos = (pos + 1) % m;
      guard += 1;
    }
  }
  return pool[pos].idea;
}

/**
 * A small, safe way to close the daily calorie gap — this is what makes
 * "calories remaining" reach exactly 0 by end of dinner for EVERYONE, no
 * matter how large their real target is (founder instruction, 2026-08-31:
 * "glufloat must always meet the calorie needs of each user no matter the
 * value... it must not be capped" / "all recommended meals must add up at
 * the end of the day to meet each user calorie goals"). `lib/tdee.ts`'s
 * `calorieTarget()` is never capped, so the achievability guarantee lives
 * entirely here: `suggestExtras()` below sizes a real LIST of safe, everyday
 * servings for each meal — long enough that the main plate plus every item
 * in the list sums to that meal's own fair share of the day — so the
 * RECOMMENDATION itself already adds up, rather than relying on a person to
 * guess how many times to come back and log another snack.
 * `ExtraSuggestionCard` (components/) also stays loggable after a tap rather
 * than disabling itself, as a safety net for real intake drifting from the
 * plan, but the primary guarantee is the list being sized correctly up
 * front. Never touches the 3 main meals' own dietitian-set portion sizes:
 * this only ever suggests MORE of an already-reviewed food that is safe to
 * eat every day, at its own existing safe portion.
 *
 * **Every food here is picked so it never also appears in BREAKFAST, LUNCH or
 * DINNER above.** A food cannot be both "your meal" and "something extra on
 * the side" in the same app — that is why eggs, fish, chicken, smoked fish,
 * stockfish and groundnut, which all show up in the meal templates, were
 * dropped from this list even though they used to be here.
 *
 * **Options are grouped by meal**, not one shared pool for the whole day, so
 * whatever shows during breakfast is something that actually belongs at
 * breakfast, and the same for lunch and dinner. Each meal gets exactly 3
 * options to choose from (`EXTRA_OPTIONS`), close to each other in calories,
 * so trying a different one does not throw off the day's numbers.
 */
const BREAKFAST_EXTRA_OPTIONS: string[][] = [
  ["fried-egg"],
  ["walnut"],
  ["almond"],
];

const LUNCH_EXTRA_OPTIONS: string[][] = [
  ["mixed-nuts"],
  ["cashew-nut"],
  ["egusi-seed"],
];

const DINNER_EXTRA_OPTIONS: string[][] = [
  ["suya"],
  ["tiger-nut", "peanut-butter"],
  ["coconut", "seeds"],
];

const EXTRA_OPTIONS: Record<NamedMeal, string[][]> = {
  breakfast: BREAKFAST_EXTRA_OPTIONS,
  lunch: LUNCH_EXTRA_OPTIONS,
  dinner: DINNER_EXTRA_OPTIONS,
};

/** Nuts and seeds sit ahead of whichever meal they are shown next to. */
const PRE_MEAL_NUTS = new Set([
  "walnut",
  "almond",
  "mixed-nuts",
  "cashew-nut",
  "egusi-seed",
  "tiger-nut",
  "coconut",
  "peanut-butter",
  "seeds",
]);

const MEAL_WORD: Record<NamedMeal, string> = {
  breakfast: "breakfast",
  lunch: "lunch",
  dinner: "dinner",
};

const FIXED_TIMING: Record<string, string> = {
  "fried-egg":
    "Fry it in only one teaspoon of oil, nothing more. Eat this with your breakfast, or any time as a light bite.",
  suya: "Eat this on its own, any time of day. It is mostly meat, so it will not push your sugar up.",
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
 */
export function extraTimingFor(id: string, meal: NamedMeal): string {
  if (FIXED_TIMING[id]) return FIXED_TIMING[id];
  if (PRE_MEAL_NUTS.has(id)) {
    return `Eat this 15 to 30 minutes before your ${MEAL_WORD[meal]}. It slows down how fast that meal pushes your sugar up.`;
  }
  return "";
}

export interface ExtraOption {
  foods: Food[];
  names: string[];
  calories: number;
}

export interface ExtraSuggestionSet {
  meal: NamedMeal;
  /**
   * Every serving recommended for THIS meal, together — not 3 alternatives
   * to pick one of. The whole point is that the main plate plus every item
   * in this list sums to this meal's own fair share of the day's target, so
   * the day's 3 recommended meals (each already including its own extras)
   * add up to the full calorie goal by construction, without anyone having
   * to guess how many times to come back and log another snack.
   */
  items: ExtraOption[];
  /** Sum of every item's calories — the total this list is meant to add. */
  totalCalories: number;
}

/** How small a leftover gap has to be before there is nothing worth suggesting. */
const MIN_GAP_KCAL = 100;

/**
 * A sanity guard on how many items one suggestion list can ever hold — not a
 * calorie ceiling (there is none, see lib/tdee.ts's calorieTarget doc), just
 * a guard against a mistyped or extreme profile producing an unusably long
 * list. 12 items at ~200kcal each is already ~2,400kcal of extras alone, on
 * top of the day's 3 real meals — comfortably past any realistic target.
 */
export const MAX_EXTRA_ITEMS = 12;

/**
 * The real, safe servings needed to close THIS meal's own share of today's
 * calorie gap — sized to the gap, not a fixed count (founder instruction,
 * 2026-08-31: "all recommended meals must add up at the end of the day to
 * meet each user calorie goals" / "glufloat must always meet the calorie
 * needs of each user no matter the value"). Rotated by day so a returning
 * person does not always see the same combination first. Returns null below
 * a small threshold (100kcal, not worth suggesting anything for a gap that
 * small) or once nothing in the list can be resolved (a food renamed or
 * removed — should not happen, never throws).
 *
 * Built from the SAME small, fixed, everyday-safe combinations as before
 * (`EXTRA_OPTIONS`) — nothing here invents a bigger single serving to
 * force-fit a big number. A large gap is closed by using MORE of these real
 * servings, cycled for variety, not by making any one of them bigger than a
 * dietitian would actually recommend.
 */
export function suggestExtras(
  remainingKcal: number,
  dayKey: string,
  meal: NamedMeal,
): ExtraSuggestionSet | null {
  if (!remainingKcal || remainingKcal < MIN_GAP_KCAL) return null;
  const templates = EXTRA_OPTIONS[meal];
  const options = templates
    .map((ids) => {
      const foods = ids.map((id) => getFood(id)).filter((f): f is Food => f != null);
      if (foods.length !== ids.length) return null;
      const calories = foods.reduce((s, f) => s + (f.calories ?? 0), 0);
      return { foods, names: foods.map((f) => cleanFoodName(f.name)), calories };
    })
    .filter((o): o is ExtraOption => o != null);
  if (options.length === 0) return null;

  const start = dayNumber(dayKey) % options.length;
  const rotated = [...options.slice(start), ...options.slice(0, start)];

  // Cycle through the rotated combinations, adding one at a time, until the
  // gap is closed (within MIN_GAP_KCAL) or the sanity guard is hit. This is
  // what makes the full recommendation (main plate + every item here) add
  // up to this meal's own fair share of the day's target.
  const items: ExtraOption[] = [];
  let left = remainingKcal;
  let i = 0;
  while (left >= MIN_GAP_KCAL && items.length < MAX_EXTRA_ITEMS) {
    const opt = rotated[i % rotated.length];
    items.push(opt);
    left -= opt.calories;
    i++;
  }
  const totalCalories = items.reduce((s, o) => s + o.calories, 0);
  return { meal, items, totalCalories };
}
