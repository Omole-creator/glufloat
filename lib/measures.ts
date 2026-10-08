/**
 * The household measures GluFloat uses, each with a REAL photo (co-founder
 * dietitian, 2026-10-08: "a cup" or "a fist" means a different size in every
 * home, and drawings did not work for her patients, so every measure the app
 * names is shown as a photo the person can open full size).
 *
 * The photos are free Unsplash photos, each looked at before use, converted by
 * scripts/measure-photos.mjs into public/img/measures/. Rename the file (and
 * the `photo` here) to swap one: next/image caches by URL.
 *
 * `match` reads the card's own words, so a measure shows only where the card
 * names it. The order of this list is the order of the guide.
 *
 * Words follow COPYWRITING-PLAYBOOK.md: plain, short, no ranges.
 */
export type MeasureKey =
  | "cup"
  | "big-spoon"
  | "spoons"
  | "fist"
  | "palm"
  | "meat-chunks"
  | "handful"
  | "thumb"
  | "pinch"
  | "egg"
  | "matchbox"
  | "tennis-ball"
  | "golf-ball"
  | "deck-of-cards";

export interface Measure {
  key: MeasureKey;
  /** What the card calls it. */
  name: string;
  /** The real size, in one short line. */
  size: string;
  /** A short label drawn on the small photo, when the photo alone is too small to read. */
  badge?: string;
  /** How to use it, in one or two plain sentences. */
  how: string;
  photo: string;
  /** Says what is literally in the photo. */
  alt: string;
  match: RegExp;
}

export const MEASURES: Measure[] = [
  {
    key: "cup",
    name: "One cup",
    size: "250ml",
    badge: "250ml",
    how: "Every cup in GluFloat is this cup: a measuring cup marked 250ml. Half a cup means fill it to the middle.",
    photo: "/img/measures/cup-250ml.jpg",
    alt: "A yellow measuring cup marked 1 cup, 250 ml",
    match: /\bcups?\b/i,
  },
  {
    key: "big-spoon",
    name: "One big spoon",
    size: "125ml, half a cup",
    badge: "125ml",
    how: "A big spoon is a soup ladle like this one, filled to the top. Two big spoons fill one cup.",
    photo: "/img/measures/big-spoon.jpg",
    alt: "A metal ladle full of soup",
    match: /big spoons?/i,
  },
  {
    key: "spoons",
    name: "Teaspoon and tablespoon",
    size: "Teaspoon 5ml. Tablespoon 15ml",
    how: "A teaspoon is the small spoon you stir tea with. Three teaspoons make one tablespoon. Fill it flat, not heaped.",
    photo: "/img/measures/spoons.jpg",
    alt: "Metal measuring spoons marked with their sizes, like 1 tsp 5ml",
    match: /\b(teaspoons?|tablespoons?)\b/i,
  },
  {
    key: "fist",
    name: "Your fist",
    size: "About as big as your closed hand",
    how: "Close your hand tight. The food should be no bigger than your own fist.",
    photo: "/img/measures/fist.jpg",
    alt: "A closed fist held up against a plain wall",
    match: /\bfist/i,
  },
  {
    key: "palm",
    name: "Your palm",
    size: "The flat inside of your hand",
    how: "Open your hand flat. The food should cover your palm, not your fingers.",
    photo: "/img/measures/palm.jpg",
    alt: "An open hand, palm up",
    match: /\bpalm\b(?![- ](oil|wine|fruit))/i,
  },
  {
    key: "meat-chunks",
    name: "Chunks of meat",
    size: "Put together, they cover your palm",
    how: "Put the chunks in your open hand. Together, they should cover your palm and no more.",
    photo: "/img/measures/meat-chunks.jpg",
    alt: "Chunks of meat cooking on a grill",
    match: /\bchunks?\b/i,
  },
  {
    key: "handful",
    name: "One handful",
    size: "What one open hand holds",
    how: "Use one hand, not two. Hold it open, like in the photo.",
    photo: "/img/measures/handful.jpg",
    alt: "An open hand holding green almonds",
    match: /\bhandful\b/i,
  },
  {
    key: "thumb",
    name: "Your thumb",
    size: "Your whole thumb, tip to base",
    how: "Each piece should be no bigger than your own thumb.",
    photo: "/img/measures/thumb.jpg",
    alt: "A hand giving a thumbs up",
    match: /\bthumb\b/i,
  },
  {
    key: "pinch",
    name: "A pinch",
    size: "What two fingers can hold",
    how: "Take it between your thumb and one finger. That is one pinch.",
    photo: "/img/measures/pinch.jpg",
    alt: "Fingertips with white powder on them",
    match: /\bpinch\b/i,
  },
  {
    key: "egg",
    name: "An egg",
    size: "One normal chicken egg",
    how: "The food should be about as big as one egg.",
    photo: "/img/measures/egg.jpg",
    alt: "One brown egg",
    match: /\b(size of|as big as) (an|one|a big|two) eggs?\b/i,
  },
  {
    key: "matchbox",
    name: "A matchbox",
    size: "About 5cm long",
    how: "The small box of matches sold in every shop. Each piece should be about this big.",
    photo: "/img/measures/matchbox.jpg",
    alt: "A yellow box of matches",
    match: /\bmatchbox\b/i,
  },
  {
    key: "tennis-ball",
    name: "A tennis ball",
    size: "About 7cm across",
    how: "Shape the food to look like this ball, and about this big.",
    photo: "/img/measures/tennis-ball.jpg",
    alt: "A yellow tennis ball",
    match: /tennis ball/i,
  },
  {
    key: "golf-ball",
    name: "A golf ball",
    size: "About 4cm across, smaller than an egg",
    how: "Shape the food to look like this ball, and about this big.",
    photo: "/img/measures/golf-ball.jpg",
    alt: "A white golf ball",
    match: /golf ball/i,
  },
  {
    key: "deck-of-cards",
    name: "A pack of cards",
    size: "About 9cm long and 2cm thick",
    how: "Like a pack of playing cards or Whot cards. The piece should be about this long and this thick.",
    photo: "/img/measures/deck-of-cards.jpg",
    alt: "A pack of playing cards",
    match: /deck of cards|pack of cards/i,
  },
];

const BY_KEY = new Map(MEASURES.map((m) => [m.key, m]));

export function measureByKey(key: MeasureKey): Measure | undefined {
  return BY_KEY.get(key);
}

/**
 * The measures a piece of text names, in the order they appear in it, so the
 * first photo is the one the sentence leads with.
 */
export function measuresIn(text: string | null | undefined): Measure[] {
  if (!text) return [];
  const found: { m: Measure; at: number }[] = [];
  for (const m of MEASURES) {
    const hit = text.match(m.match);
    if (hit && hit.index !== undefined) found.push({ m, at: hit.index });
  }
  return found.sort((a, b) => a.at - b.at).map((f) => f.m);
}

/** One window event, the same pub/sub idiom as TOAST_EVENT and INTAKE_CHANGED. */
export const OPEN_MEASURE_GUIDE = "glufloat:open-measure-guide";

export function openMeasureGuide(key?: MeasureKey): void {
  try {
    window.dispatchEvent(new CustomEvent(OPEN_MEASURE_GUIDE, { detail: key ?? null }));
  } catch {
    /* no window */
  }
}
