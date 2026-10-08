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
 *   cup-250ml v4I2OMRq_rg (printed "1 cup 250 ml"), fist h4elZPxUXLU, palm zabFZL-OYAk, tennis-ball VEW78A1YZ6I,
 *   matchbox e0OS4EQHX2o, deck-of-cards IEISYENbXp8, spoons KOAM0tomZj8,
 *   golf-ball uy5ZEqUOscs, thumb 3KEFp35FVB0, pinch zet6NIY02hI,
 *   handful 8JbPccfCr5o, egg UQawLoFS4uM, meat-chunks 1ok-cifMvg0,
 *   big-spoon WBX-ZLr8P7I (a metal ladle full of soup: one big spoon, 125ml)
 */
const PHOTOS = {
  "cup-250ml": "centre",
  // The fist is small in the middle of a wide frame. Cut out the middle half
  // first (fractions of the source) so it fills the square.
  fist: { left: 0.25, top: 0.08, size: 0.5 },
  palm: "centre",
  "tennis-ball": "attention",
  matchbox: "centre",
  "deck-of-cards": "centre",
  spoons: "centre",
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
  if (typeof position === "object") {
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
