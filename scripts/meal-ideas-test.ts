/**
 * The daily meal suggestions, checked.
 *
 * These plates are shown to people with diabetes as "your breakfast for today",
 * with no dietitian standing between the list and the person, so the list has to
 * be provably safe and provably sensible. Run this after ANY edit to
 * lib/nextMeal.ts:
 *
 *   npx tsx scripts/meal-ideas-test.ts
 *
 * It exits non-zero rather than let a bad plate through.
 */
import { ideasFor, planForDay } from "../lib/nextMeal";
import { getFood } from "../lib/search";
import { scoreMeal } from "../lib/verdictEngine";
import type { NamedMeal } from "../lib/mealtime";

const MEALS: NamedMeal[] = ["breakfast", "lunch", "dinner"];
const problems: string[] = [];
const fail = (m: string) => problems.push(m);

// Something that carries the meal, and something to eat it with. A single food
// on its own is not a plate. Lunch and dinner must be led by a starch, a beans
// food or a soup; a breakfast may be led by eggs or yogurt instead, because a
// plate of eggs and avocado is a real Nigerian breakfast and a plate of eggs and
// avocado is not a dinner.
const BASE_ROLES = new Set(["starch", "legume", "soup"]);
const BREAKFAST_BASE_ROLES = new Set([
  ...BASE_ROLES,
  "protein",
  "dairy",
]);

for (const meal of MEALS) {
  const list = ideasFor(meal);
  if (list.length < 12) {
    fail(`${meal}: only ${list.length} ideas. Too few to keep a month varied.`);
  }

  const seen = new Set<string>();
  list.forEach((ids, i) => {
    const where = `${meal}[${i}] (${ids.join(" + ")})`;

    // 1. Every id resolves.
    const foods = ids.map((id) => ({ id, food: getFood(id) }));
    const missing = foods.filter((f) => !f.food).map((f) => f.id);
    if (missing.length) {
      fail(`${where}: no such food: ${missing.join(", ")}`);
      return;
    }
    const items = foods.map((f) => f.food!);

    // 2. Every food is green on its own.
    for (const f of items) {
      if (f.baseVerdict !== "green") {
        fail(`${where}: ${f.id} is ${f.baseVerdict}, not green`);
      }
    }

    // 3. The whole plate scores green through the real engine.
    const result = scoreMeal(items.map((food) => ({ food, portion: "normal" as const })));
    if (result.verdict !== "green") {
      fail(`${where}: the plate scores ${result.verdict}, not green`);
    }

    // 4. A plate is a base plus something to eat it with.
    if (items.length < 2) {
      fail(`${where}: one food is not a plate`);
    }
    const bases = meal === "breakfast" ? BREAKFAST_BASE_ROLES : BASE_ROLES;
    if (!items.some((f) => bases.has(f.role))) {
      fail(`${where}: nothing on this plate carries the meal`);
    }

    // 5. Breakfast is breakfast. A swallow with a soup is a lunch plate, and
    //    offering it at 7am is the exact mistake this test exists for.
    if (meal === "breakfast") {
      const hasSwallow = items.some((f) => f.category === "swallow");
      const hasSoup = items.some((f) => f.category === "soup");
      if (hasSwallow && hasSoup) {
        fail(`${where}: a swallow-and-soup plate is not a breakfast`);
      }
    }

    // 6. No plate is listed twice.
    const key = [...ids].sort().join("|");
    if (seen.has(key)) fail(`${where}: this plate is already in the list`);
    seen.add(key);
  });
}

// 7. Thirty days in a row: never the same plate two days running, and no plate
//    shown more than twice in the month.
const DAY_MS = 86_400_000;
for (const meal of MEALS) {
  const shown: number[] = [];
  const times = new Map<number, number>();
  for (let d = 0; d < 30; d++) {
    const dayKey = new Date(Date.parse("2026-07-21T00:00:00Z") + d * DAY_MS)
      .toISOString()
      .slice(0, 10);
    // The last 3 days, which is what the device remembers.
    const avoid = shown.slice(-3);
    const idea = planForDay(meal, dayKey, new Map(), 0, avoid);
    if (shown.length && idea.index === shown[shown.length - 1]) {
      fail(`${meal}: the same plate two days running, on day ${d + 1}`);
    }
    shown.push(idea.index);
    times.set(idea.index, (times.get(idea.index) ?? 0) + 1);
  }
  for (const [index, n] of times) {
    if (n > 2) {
      fail(`${meal}: plate ${index} shown ${n} times in 30 days`);
    }
  }
}

// 8. "Try another meal" must actually give another meal, several taps deep.
for (const meal of MEALS) {
  const seen = new Set<number>();
  for (let offset = 0; offset < 6; offset++) {
    const idea = planForDay(meal, "2026-07-21", new Map(), offset, []);
    if (seen.has(idea.index)) {
      fail(`${meal}: tap ${offset + 1} of "try another meal" repeats a plate`);
    }
    seen.add(idea.index);
  }
}

// 9. The same 30 days again, but for a real person: one who eats a lot of the
//    same thing (counts), has logged some of it green (liked), and keeps
//    skipping plates. The personal signals must not be able to break the
//    no-repeat rule, which is the one rule that must never bend.
const HEAVY = new Map<string, number>([
  ["Oat Swallow", 12],
  ["Egusi Soup", 9],
  ["Cooked Beans", 7],
  ["Eggs (boiled)", 6],
  ["Oats (plain)", 5],
]);
const LIKED = new Map<string, number>([
  ["Egusi Soup", 4],
  ["Fish (Titus / Mackerel / Sardine)", 3],
  ["Moi Moi", 2],
]);
const REMEMBER_SKIPS = 10; // mirrors components/TodaysMeal.tsx
const MAX_AVOID = 12; // ditto

for (const meal of MEALS) {
  const shown: number[] = [];
  const skipped: number[] = [];
  const times = new Map<number, number>();
  for (let d = 0; d < 30; d++) {
    const dayKey = new Date(Date.parse("2026-07-21T00:00:00Z") + d * DAY_MS)
      .toISOString()
      .slice(0, 10);
    // What the device really passes: the last 3 days' plates, then the skips.
    const avoid = [...new Set([...shown.slice(-3), ...skipped])].slice(0, MAX_AVOID);
    const idea = planForDay(meal, dayKey, HEAVY, 0, avoid, LIKED);
    if (shown.length && idea.index === shown[shown.length - 1]) {
      fail(`${meal}: same plate two days running with real signals, day ${d + 1}`);
    }
    shown.push(idea.index);
    times.set(idea.index, (times.get(idea.index) ?? 0) + 1);
    // Every third day they press "try another meal" once and move on.
    if (d % 3 === 0) {
      skipped.push(idea.index);
      while (skipped.length > REMEMBER_SKIPS) skipped.shift();
    }
  }
  /**
   * Three, not two, and that is arithmetic rather than a loosened rule.
   * Breakfast has 20 plates, so 30 days already means ten of them come round
   * twice; every skip then takes another plate out of circulation, and what is
   * left must come round more often. Skipping is the person telling us to stop
   * offering something, so this is the behaviour working. The rule that must
   * NOT bend is the one above: never the same plate two days running.
   */
  for (const [index, n] of times) {
    if (n > 3) {
      fail(`${meal}: plate ${index} shown ${n} times in 30 days with real signals`);
    }
  }
}

// 10. Six taps of "try another meal" in one sitting, with each skipped plate
//     being remembered as the person goes, still give six different plates.
for (const meal of MEALS) {
  const seen = new Set<number>();
  const skipped: number[] = [];
  for (let offset = 0; offset < 6; offset++) {
    const avoid = [...new Set(skipped)].slice(0, MAX_AVOID);
    const idea = planForDay(meal, "2026-07-21", HEAVY, offset, avoid, LIKED);
    if (seen.has(idea.index)) {
      fail(`${meal}: tap ${offset + 1} of "try another meal" repeats a plate`);
    }
    seen.add(idea.index);
    skipped.push(idea.index);
  }
}

if (problems.length) {
  console.error(`\n${problems.length} problem(s):\n`);
  problems.forEach((p) => console.error("  " + p));
  process.exit(1);
}

const counts = MEALS.map((m) => `${m} ${ideasFor(m).length}`).join(", ");
console.log(`All meal ideas are green, real, and time-appropriate (${counts}).`);
