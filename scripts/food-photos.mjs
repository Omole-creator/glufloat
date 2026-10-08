import sharp from "sharp";
import { mkdirSync, readdirSync } from "node:fs";

/**
 * Real photos of a food AT ITS CARD'S AMOUNT, for the cards that name no
 * household measure ("Two eggs", "One slice", "Half of one banana")
 * (co-founder dietitian + founder, 2026-10-08: same food, same count; a
 * photo may be cropped to the right number; a drawing only when no honest
 * photo exists).
 *
 * Sources: free Unsplash and Pexels photos only (founder's choice: no credit
 * line needed), each looked at and counted before use. Originals live at the
 * repo root in `food-photos/` (NOT version-controlled), one file per food id;
 * the ids of the source photos are recorded in lib/foodPhotos.ts.
 *
 *   node scripts/food-photos.mjs
 *
 * `CROPS` cuts a photo down to the card's amount, in fractions of the source
 * (left, top, width, height). Everything else is a centre square crop. To swap
 * a photo, give the output a NEW name (next/image caches by URL).
 */
const CROPS = {
  // Fractions of the source (left, top, width, height). `pad` keeps the whole
  // cut (a tall bottle, a long strip) and sets it on a plain
  // background, instead of cropping square and pulling in a neighbour.
  banana: { left: 0.62, top: 0.36, width: 0.36, height: 0.5, pad: true },
  "chocolate-spread": { left: 0.6, top: 0.42, width: 0.4, height: 0.32, pad: true },
  bacon: { left: 0, top: 0.125, width: 1, height: 0.265, pad: true },
  beer: { left: 0.27, top: 0.16, width: 0.37, height: 0.72, pad: true },
  almond: { left: 0.04, top: 0.06, width: 0.62, height: 0.88, pad: true },
  "french-fries": { left: 0.3, top: 0.3, width: 0.42, height: 0.28, pad: true },
  "passion-fruit": { left: 0.48, top: 0.17, width: 0.34, height: 0.32, pad: true },
  "meat-pie": { left: 0.49, top: 0.3, width: 0.32, height: 0.42, pad: true },
  shawarma: { left: 0.5, top: 0.28, width: 0.5, height: 0.62, pad: true },
  dates: { left: 0.05, top: 0.2, width: 0.68, height: 0.29, pad: true },
  // The whole photo, so none of the counted items is cut off.
  tomato: { left: 0, top: 0, width: 1, height: 1, pad: true },
  strawberry: { left: 0, top: 0, width: 1, height: 1, pad: true },
  "plantain-chips": { left: 0, top: 0, width: 1, height: 1, pad: true },
};

const SRC = "../food-photos";
const OUT = "public/img/food-portions";
mkdirSync(OUT, { recursive: true });

for (const file of readdirSync(SRC).filter((f) => f.endsWith(".jpg"))) {
  const id = file.replace(/\.jpg$/, "");
  let img = sharp(`${SRC}/${file}`).rotate();
  const c = CROPS[id];
  if (c) {
    const { width, height } = await sharp(`${SRC}/${file}`).metadata();
    img = img.extract({
      left: Math.round(width * c.left),
      top: Math.round(height * c.top),
      width: Math.round(width * c.width),
      height: Math.round(height * c.height),
    });
  }
  if (c?.pad) {
    const fg = await img.resize(720, 720, { fit: "inside" }).toBuffer();
    const meta = await sharp(fg).metadata();
    // A plain colour from the cut itself, never a blurred copy of the whole
    // photo: that showed blurry extra dates behind the one date, which reads
    // as "more than one".
    const { dominant } = await sharp(fg).stats();
    await sharp({ create: { width: 720, height: 720, channels: 3, background: dominant } })
      .composite([{ input: fg, left: Math.round((720 - meta.width) / 2), top: Math.round((720 - meta.height) / 2) }])
      .jpeg({ quality: 82, mozjpeg: true })
      .toFile(`${OUT}/${id}.jpg`);
    continue;
  }
  await img
    .resize(720, 720, { fit: "cover", position: c ? "centre" : "attention" })
    .jpeg({ quality: 82, mozjpeg: true })
    .toFile(`${OUT}/${id}.jpg`);
}
console.log("written:", readdirSync(OUT).length);
