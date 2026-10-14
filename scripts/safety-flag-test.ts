// The clinician safety flag (lib/safetyFlag.ts). Run: npx tsx scripts/safety-flag-test.ts
import { safetyEvents, safetyBadge, safetyLine, FLAG_DAYS } from "../lib/safetyFlag";
import type { Reading } from "../lib/glucose";

let fail = 0;
const ok = (c: boolean, m: string) => { if (!c) { fail++; console.log("FAIL", m); } else console.log("ok  ", m); };

const now = new Date("2026-10-14T12:00:00Z");
const at = (hoursAgo: number) => new Date(now.getTime() - hoursAgo * 3600000).toISOString();
let id = 1;
const r = (mgdl: number, hoursAgo: number, mealCheckId: number | null = null, context: Reading["context"] = null): Reading =>
  ({ id: id++, mealCheckId, valueRaw: mgdl, unit: "mgdl", mgdl, takenAt: at(hoursAgo), context });

ok(safetyEvents([], now).length === 0, "no readings, no flag");
ok(safetyEvents([r(130, 5, 1, "before_meal"), r(180, 3, 1, "after_meal")], now).length === 0, "130 -> 180 is not flagged");
ok(safetyEvents([r(150, 5, 1, "before_meal"), r(200, 3, 1, "after_meal")], now).length === 0, "150 -> 200 is not flagged");
ok(safetyEvents([r(110, 5, 1, "before_meal"), r(260, 3, 1, "after_meal")], now).length === 0, "a big meal rise alone is not flagged");
ok(safetyEvents([r(70, 2)], now).length === 0, "exactly 70 is not under 70");
ok(safetyEvents([r(300, 2)], now).length === 0, "exactly 300 is not over 300");
ok(safetyEvents([r(69, 2)], now)[0]?.kind === "low", "69 is low");
ok(safetyEvents([r(301, 2)], now)[0]?.kind === "high", "301 is high");
ok(safetyEvents([r(50, 2, 4, "before_meal")], now)[0]?.kind === "low", "a low before a meal still counts");

const drop = safetyEvents([r(140, 5, 2, "before_meal"), r(95, 3, 2, "after_meal")], now);
ok(drop.length === 1 && drop[0].kind === "drop" && drop[0].beforeMgdl === 140, "140 -> 95 is a drop");
ok(safetyEvents([r(140, 5, 2, "before_meal"), r(110, 3, 2, "after_meal")], now).length === 0, "140 -> 110 ends over 100: no drop");
ok(safetyEvents([r(120, 5, 2, "before_meal"), r(95, 3, 2, "after_meal")], now).length === 0, "120 -> 95 falls only 25: no drop");
ok(safetyEvents([r(140, 5, 2, "before_meal"), r(95, 3, 3, "after_meal")], now).length === 0, "different meals are never compared");
ok(safetyEvents([r(95, 5, 2, "after_meal"), r(140, 3, 2, "before_meal")], now).length === 0, "a before test taken later is not 'before'");
ok(safetyEvents([r(140, 5, 2, "before_meal"), r(95, 3, null)], now).length === 0, "a loose test is not a drop");
const both = safetyEvents([r(140, 5, 2, "before_meal"), r(60, 3, 2, "after_meal")], now);
ok(both.length === 1 && both[0].kind === "low", "a drop under 70 counts once, as low");

ok(safetyEvents([r(40, FLAG_DAYS * 24 + 1)], now).length === 0, "older than the window is not flagged");
ok(safetyEvents([r(40, FLAG_DAYS * 24 - 1)], now).length === 1, "inside the window is flagged");

const many = safetyEvents([r(320, 30), r(60, 2), r(55, 50)], now);
ok(many[0].mgdl === 60, "newest first");
ok(safetyBadge(many) === "Under 70 + 2 more", "badge counts the rest");
ok(safetyBadge([]) === null, "no badge when nothing to flag");
const lines = many.map(safetyLine).join(" ") + safetyLine(drop[0]);
ok(!/caus|because|danger|bad|should|must/i.test(lines), "lines name no cause and give no order");
ok(/mg\/dL/.test(lines) && /mmol\/L/.test(lines), "lines carry both units");

console.log(fail ? `\n${fail} FAILED` : "\nAll passed");
process.exit(fail ? 1 : 0);
