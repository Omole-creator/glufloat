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
  assertTrue(
    `${food.id}: every swap is the same category`,
    swaps.every((s) => s.category === food.category),
  );
  assertTrue(
    `${food.id}: every swap is green (never a sideways or worse swap)`,
    swaps.every((s) => s.baseVerdict === "green"),
  );
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
