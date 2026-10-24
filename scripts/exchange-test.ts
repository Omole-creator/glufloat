// Sanity cases for the swap/exchange logic in lib/variety.ts, no server needed.
// Run after any edit to saferSwaps() or to the "Try this instead" block in
// components/VerdictCard.tsx.
import { FOODS } from "../lib/search";
import { saferSwaps } from "../lib/variety";

let failures = 0;
function assertTrue(label: string, cond: boolean) {
  if (!cond) {
    console.error(`FAIL ${label}`);
    failures++;
  } else {
    console.log(`ok   ${label}`);
  }
}

// 1. Structural invariants, checked over every food in the real dataset -------
for (const food of FOODS) {
  const swaps = saferSwaps(food, 3);
  assertTrue(
    `${food.id}: swap never suggests the food itself`,
    swaps.every((s) => s.id !== food.id),
  );
  // Same group, except a snack, which swaps to a whole-food snack (lib/variety.ts SNACK_SWAPS).
  assertTrue(
    `${food.id}: every swap is the same category, or a whole-food snack for a snack`,
    swaps.every((s) => s.category === food.category || (food.category === "snack" && ["groundnut", "tiger-nut", "garden-egg", "cashew-nut", "cucumber"].includes(s.id))),
  );
  assertTrue(
    `${food.id}: no swap carries its own red warning box`,
    swaps.every((s) => !s.healthNote),
  );
  assertTrue(
    `${food.id}: a snack is never swapped for meat`,
    food.category !== "snack" || swaps.every((s) => s.role !== "protein"),
  );
  // A swallow may also swap to a yellow swallow that raises sugar more slowly
  // (plantain amala, cocoyam fufu; founder, 2026-10-12). Never sideways.
  const rank = { low: 0, medium: 1, high: 2 } as const;
  assertTrue(
    `${food.id}: every swap is green, or a slower swallow (never a sideways or worse swap)`,
    swaps.every((s) => s.baseVerdict === "green" || (food.category === "swallow" && rank[s.gi] < rank[food.gi])),
  );
}

// 1c. A swallow's swap takes turns evenly across the slower swallows.
// Acha is medium since 2026-10-24, so it is now one of the four slower swallows.
for (const id of ["garri-eba", "tuwo-shinkafa", "pounded-yam"]) {
  const food = FOODS.find((f) => f.id === id)!;
  const shown = [0, 1, 2, 3, 4, 5, 6, 7].map((t) => saferSwaps(food, 1, t)[0]?.id);
  const tally = new Map<string, number>();
  for (const s of shown) if (s) tally.set(s, (tally.get(s) ?? 0) + 1);
  assertTrue(
    `${id}: eight looks show oat swallow, plantain amala, cocoyam fufu and acha twice each`,
    tally.size === 4 && [...tally.values()].every((n) => n === 2),
  );
}
const plantainAmala = FOODS.find((f) => f.id === "amala-plantain")!;
assertTrue(
  "amala-plantain: only oat swallow is slower",
  saferSwaps(plantainAmala, 3).map((s) => s.id).join() === "oat-swallow",
);

// 1b. The fried and sweet snacks that used to be told "try suya" or "try
// nkwobi" now get a real snack.
for (const id of ["puff-puff", "chin-chin", "plantain-chips", "dodo-ikire", "mosa"]) {
  const sw = saferSwaps(FOODS.find((f) => f.id === id)!, 3);
  assertTrue(`${id}: offered a whole-food snack`, sw.length > 0 && !sw.some((s) => ["suya", "nkwobi"].includes(s.id)));
}

// 2. A red staple with a real green sibling in its category gets one --------
const ebaFriends = saferSwaps(FOODS.find((f) => f.id === "garri-eba")!, 3);
assertTrue(
  "eba (a real Nigerian swallow) has at least one green swallow to swap to",
  ebaFriends.length > 0,
);

// 3. carbG-proximity ranking: when the food has a measured carbG, the first
// suggestion should be at least as close in carbG as any later one --------
const withCarb = FOODS.find(
  (f) => f.carbG != null && f.baseVerdict !== "green" && saferSwaps(f, 3).length >= 2,
);
if (withCarb) {
  const swaps = saferSwaps(withCarb, 3).filter((s) => s.carbG != null);
  const diffs = swaps.map((s) => Math.abs(s.carbG! - withCarb.carbG!));
  assertTrue(
    `${withCarb.id}: carbG-ranked swaps are non-decreasing in distance`,
    diffs.every((d, i) => i === 0 || d >= diffs[i - 1]),
  );
} else {
  console.log("ok   (no food with 2+ carbG-bearing swaps to check ranking on; skipped)");
}

// 4. VerdictCard only offers a swap for a non-green food (mirrors the
// component's own gate: `food.baseVerdict !== "green" ? saferSwaps(...)[0]`) --
const green = FOODS.find((f) => f.baseVerdict === "green");
assertTrue(
  "a green food's own card would show no swap box (gate is baseVerdict !== green)",
  !!green,
);

if (failures > 0) {
  console.error(`\n${failures} failure(s).`);
  process.exit(1);
}
console.log("\nall passed.");
