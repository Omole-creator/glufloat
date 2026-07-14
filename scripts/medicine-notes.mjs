/**
 * Owns `medicineNote` on every food. Idempotent and id-keyed: run it as often
 * as you like, and it clears a note that no longer applies.
 *
 *   node scripts/medicine-notes.mjs
 *
 * A medicine note is NOT a health warning. `healthNote` is the red box that says
 * "this food may harm you". This is the calm grey box that says "time your
 * tablet around this food", and it must never be used to talk somebody out of a
 * food.
 *
 * Okra is the reason it exists. One study in RATS found that okra reduced how
 * much metformin was absorbed, while a 2023 trial in PEOPLE found okra actually
 * improved blood sugar control. Okra is a green staple and one of the best foods
 * on the whole list. So the dietician asked for a gentle note, and a red box
 * would have told people to stop eating it, which is the opposite of the truth
 * and the more likely way to do harm. See docs/EVIDENCE.md.
 */
import { readFileSync, writeFileSync } from "node:fs";

const FILE = new URL("../data/foods.json", import.meta.url);
const foods = JSON.parse(readFileSync(FILE, "utf8"));

const NOTES = {
  "okra-soup":
    "Okra is very good for you. Keep eating it. If you take metformin, take your tablet about 2 hours before or after okra soup.",
  "okra-veg":
    "Okra is very good for you. Keep eating it. If you take metformin, take your tablet about 2 hours before or after okra.",
};

const byId = new Map(foods.map((f) => [f.id, f]));
for (const id of Object.keys(NOTES)) {
  if (!byId.has(id)) {
    console.error(`no such food: ${id}`);
    process.exit(1);
  }
}

let set = 0;
let cleared = 0;
for (const f of foods) {
  const note = NOTES[f.id];
  if (note) {
    if (f.medicineNote !== note) set += 1;
    f.medicineNote = note;
  } else if ("medicineNote" in f) {
    delete f.medicineNote;
    cleared += 1;
  }
}

writeFileSync(FILE, JSON.stringify(foods, null, 2) + "\n");
console.log(
  `${Object.keys(NOTES).length} food(s) carry a medicine note. ${set} written, ${cleared} cleared.`,
);
