import sharp from "sharp";

/**
 * The real photos for the "How to measure" guide (co-founder dietitian,
 * 2026-10-08: every household measure GluFloat names must have a real photo,
 * because "a fist" or "a cup" means a different size in every home, and
 * drawings did not work for her patients).
 *
 * Same pattern as photos.mjs: the sources are free Unsplash photos kept at the
 * repo root in `measure-photos/` (NOT version-controlled), converted here into
 * public/img/measures/. Each one was looked at before it was used. To swap a
 * photo, give the output a NEW filename (next/image caches by URL).
 *
 *   node scripts/measure-photos.mjs
 *
 * Unsplash ids, for the record:
 *   cup-glass-250ml and fist-closed are the founder's own photos (2026-10-09);
 *   they replaced a mug (Unsplash 6TjDbd5PNTU) and a fist (h4elZPxUXLU).
 *   palm zabFZL-OYAk, tennis-ball VEW78A1YZ6I,
 *   matchbox e0OS4EQHX2o, deck-of-cards IEISYENbXp8, teaspoon and tablespoon
 *   from Pexels (see PHOTOS),
 *   golf-ball uy5ZEqUOscs, thumb 3KEFp35FVB0, pinch zet6NIY02hI,
 *   handful 8JbPccfCr5o, egg UQawLoFS4uM, meat-chunks 1ok-cifMvg0,
 *   big-spoon WBX-ZLr8P7I (a metal ladle full of soup: one big spoon, 125ml)
 */
const PHOTOS = {
  // The founder's own cup and fist (2026-10-09), replacing the Unsplash mug and
  // fist. New file names, because next/image caches by URL.
  "cup-glass-250ml": { left: 0.28, top: 0.13, size: 0.44 },
  "fist-closed": { left: 0.29, top: 0.17, size: 0.41 },
  palm: "centre",
  "tennis-ball": "attention",
  matchbox: "centre",
  "deck-of-cards": "centre",
  // One spoon each, never a set of measuring spoons (founder, 2026-10-08: the
  // old spoons photo showed five sizes at once and was hard to see). Both are
  // filled level, as the guide says: Pexels 4199094 (one teaspoon of salt)
  // and Unsplash vPb24SDR0ww (one spoon of oil).
  "teaspoon-salt": { left: 0.1, top: 0.22, size: 0.8 },
  "tablespoon-oil": { left: 0.22, top: 0.2, size: 0.62 },
  "golf-ball": "attention",
  thumb: "centre",
  pinch: "attention",
  handful: "attention",
  egg: "centre",
  "meat-chunks": "attention",
  "big-spoon": "attention",
};

for (const [name, position] of Object.entries(PHOTOS)) {
  const src = `../measure-photos/${name}.jpg`;
  let img = sharp(src).rotate();
  if (typeof position === "object" && position.px) {
    img = img.extract({ left: position.px.left, top: position.px.top, width: position.px.size, height: position.px.size });
  } else if (typeof position === "object") {
    const { width, height } = await sharp(src).metadata();
    const side = Math.round(width * position.size);
    img = img.extract({
      left: Math.round(width * position.left),
      top: Math.round(height * position.top),
      width: Math.min(side, width - Math.round(width * position.left)),
      height: Math.min(side, height - Math.round(height * position.top)),
    });
  }
  await img
    .resize(720, 720, { fit: "cover", position: typeof position === "string" ? position : "centre" })
    .jpeg({ quality: 82, mozjpeg: true })
    .toFile(`public/img/measures/${name}.jpg`);
  console.log(`${name}.jpg written`);
}
