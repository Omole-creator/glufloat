// npx tsx scripts/weight-trend-test.ts
// The weight flag (lib/weightTrend.ts): when it speaks, and when it stays quiet.
import { weightFlag, weightFlagLine, weightGoal, type WeightPoint } from "../lib/weightTrend";

let failures = 0;
const check = (name: string, cond: boolean) => {
  if (!cond) {
    failures++;
    console.log(`FAIL  ${name}`);
  } else console.log(`PASS  ${name}`);
};

const d = (daysAgo: number) => new Date(Date.UTC(2026, 9, 11) - daysAgo * 864e5).toISOString();
const series = (...kg: [number, number][]): WeightPoint[] => kg.map(([w, ago]) => ({ kg: w, at: d(ago) }));

// Losing weight, but it went up two months running by 4kg: flag.
const up = series([82, 60], [84, 30], [86, 0]);
const f1 = weightFlag(up, "lose");
check("lose goal, up 2kg + 2kg: flagged", f1?.moved === "up");
check("the line states numbers and the goal, nothing else",
  !!f1 && /82 kg.*84 kg.*86 kg/.test(weightFlagLine(f1)) && /lose weight/.test(weightFlagLine(f1)));
check("the line never grades (no bad/worse/failed/should)",
  !!f1 && !/\b(bad|worse|fail|should|warning|danger)/i.test(weightFlagLine(f1)));

// Losing, and it went down: no flag.
check("lose goal, going down: quiet", weightFlag(series([86, 60], [84, 30], [82, 0]), "lose") === null);
// Up only one month: no flag.
check("up one month, down the next: quiet", weightFlag(series([82, 60], [85, 30], [84, 0]), "lose") === null);
// Up both months but tiny (scale noise): no flag.
check("up 0.6 + 0.6kg (under 2kg total): quiet", weightFlag(series([82, 60], [82.6, 30], [83.2, 0]), "lose") === null);
// Only two weigh-ins: no flag.
check("two weigh-ins only: quiet", weightFlag(series([82, 30], [86, 0]), "lose") === null);
// Three weigh-ins in one fortnight are not two months.
check("three weigh-ins within 2 weeks: quiet", weightFlag(series([82, 14], [84, 7], [86, 0]), "lose") === null);
// Steady goal: either direction counts.
check("steady goal, down 2 months by 3kg: flagged", weightFlag(series([80, 62], [78.5, 31], [77, 0]), "steady")?.moved === "down");
check("steady goal, up 2 months by 3kg: flagged", weightFlag(series([77, 62], [78.5, 31], [80, 0]), "steady")?.moved === "up");
// Gain goal: falling is the wrong way, rising is not.
check("gain goal, falling: flagged", weightFlag(series([50, 60], [48.5, 30], [47, 0]), "gain")?.moved === "down");
check("gain goal, rising: quiet", weightFlag(series([47, 60], [48.5, 30], [50, 0]), "gain") === null);
// Extra weigh-ins in between do not confuse it: it picks a month apart.
check("weekly weigh-ins, steady rise: flagged",
  weightFlag(series([82, 63], [82.5, 56], [83, 49], [84, 31], [84.5, 21], [85, 7], [86, 0]), "lose")?.moved === "up");

// What the goal asks for.
check("lose_weight goal is 'lose'", weightGoal(["lose_weight"], 31) === "lose");
check("gain_weight counts only when underweight", weightGoal(["gain_weight"], 17) === "gain" && weightGoal(["gain_weight"], 27) === "steady");
check("no goal is 'steady'", weightGoal([], 24) === "steady");

if (failures) {
  console.error(`\n${failures} failure(s).`);
  process.exit(1);
}
console.log("\nall passed.");
