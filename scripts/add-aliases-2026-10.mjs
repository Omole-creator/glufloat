// Adds names people type for foods that already have a card (2026-10-10).
// Research: GluFloat-New-Foods-Research.md at the repo root's parent folder.
// Idempotent: only appends an alias that is not already on the card, and
// touches no other field. Safe to re-run.
// Left out on purpose: tinko/kundi/banda (chunks, but the kilishi photo shows
// thin sheets) and balangu (not on a stick, but the suya card says one stick).
import { readFileSync, writeFileSync } from "node:fs";

const FILE = new URL("../data/foods.json", import.meta.url);
const foods = JSON.parse(readFileSync(FILE, "utf8"));

const ADD = {
  "bitterleaf-veg": ["ewuro"],
  pomo: ["kpomo"],
  "garri-eba": ["ijebu garri"],
  "cow-leg": ["bokoto"],
  "puff-puff": ["kpof kpof"],
  "pepper-soup": ["point and kill"],
  "plantain-chips": ["ipekere", "kpekere"],
  "jollof-rice": ["iwuk edesi"],
  "okra-soup": ["otong soup", "otong"],
  "smoked-fish": ["bonga", "bonga fish"],
  fish: ["kote"],
  "egusi-soup": ["ofe achara", "achara soup"],
};

// An alias must lead to exactly one card, or search shows the wrong food.
const taken = new Map();
for (const f of foods) for (const a of f.aliases || []) taken.set(a.toLowerCase(), f.id);

let added = 0;
for (const [id, names] of Object.entries(ADD)) {
  const f = foods.find((x) => x.id === id);
  if (!f) throw new Error(`no food with id ${id}`);
  for (const n of names) {
    const owner = taken.get(n.toLowerCase());
    if (owner === id) continue;
    if (owner) throw new Error(`"${n}" already belongs to ${owner}`);
    f.aliases.push(n);
    taken.set(n.toLowerCase(), id);
    added++;
    console.log(`${id} + "${n}"`);
  }
}

writeFileSync(FILE, JSON.stringify(foods, null, 2) + "\n");
console.log(`${added} aliases added`);
