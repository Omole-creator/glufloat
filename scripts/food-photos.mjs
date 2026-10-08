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
  "energy-drink": { left: 0.1, top: 0.3, width: 0.8, height: 0.5, pad: true },
  "condensed-milk": { left: 0.3, top: 0.09, width: 0.52, height: 0.84, pad: true },
  "seasoning-cube": { left: 0.47, top: 0.7, width: 0.3, height: 0.22, pad: true },
  // Fruit measured as itself (founder, 2026-10-08), each counted.
  apple: { left: 0.08, top: 0.28, width: 0.84, height: 0.42, pad: true },
  mango: { left: 0.27, top: 0.1, width: 0.46, height: 0.8 },
  pineapple: { left: 0.1, top: 0.33, width: 0.85, height: 0.34 },
  jackfruit: { left: 0.1, top: 0.08, width: 0.65, height: 0.84, pad: true },
  pomegranate: { left: 0.15, top: 0, width: 0.7, height: 1 },
  watermelon: { left: 0.28, top: 0.5, width: 0.48, height: 0.32, pad: true },
};

/**
 * Brand names and logos are blurred out (founder, 2026-10-08: "use the photos
 * then blur the logos"). The only photos that exist of these foods carry a
 * brand; the food and its amount stay sharp, only the printing is blurred.
 * Boxes are fractions of the source, applied before the crop above.
 */
const BLUR = {
  // Every box reaches past its text by the width of its soft edge, or the
  // fading edge lets the letters show through.
  // The can's lettering, side text included; the can's end and the ice stay sharp.
  "energy-drink": [{ left: 0.1, top: 0.33, width: 0.58, height: 0.45, sigma: 32 }],
  // The whole printed tin (name, brand, barcode) and the tins above, below and beside it.
  "condensed-milk": [{ left: 0.24, top: 0, width: 0.66, height: 1, sigma: 28 }],
  // One cube; a light blur smears the print but keeps the gold wrapped cube.
  "seasoning-cube": [{ left: 0.5, top: 0.72, width: 0.25, height: 0.18, sigma: 7 }],
};

const SRC = "../food-photos";
const OUT = "public/img/food-portions";
mkdirSync(OUT, { recursive: true });

for (const file of readdirSync(SRC).filter((f) => f.endsWith(".jpg"))) {
  const id = file.replace(/\.jpg$/, "");
  let src = `${SRC}/${file}`;
  if (BLUR[id]) {
    // A feathered blur: each box fades into the photo over a soft edge, so it
    // reads as a retouch, not a pasted-on square.
    const base = sharp(src).rotate();
    const { width, height } = await base.metadata();
    let out = await base.jpeg({ quality: 95 }).toBuffer();
    for (const b of BLUR[id]) {
      const x = Math.round(width * b.left), y = Math.round(height * b.top);
      const w = Math.round(width * b.width), h = Math.round(height * b.height);
      const feather = Math.round(Math.min(w, h) * 0.18) + 6;
      // The shape on a transparent canvas, its edge softened; "dest-in" keeps
      // the blurred copy only where that shape is, fading out at the edge.
      const shape = await sharp(
        Buffer.from(`<svg width="${width}" height="${height}"><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${feather}" fill="white"/></svg>`),
      )
        .blur(feather)
        .png()
        .toBuffer();
      const blurred = await sharp(out)
        .blur(b.sigma)
        .ensureAlpha()
        .composite([{ input: shape, blend: "dest-in" }])
        .png()
        .toBuffer();
      out = await sharp(out).composite([{ input: blurred }]).jpeg({ quality: 95 }).toBuffer();
    }
    src = out;
  }
  let img = sharp(src);
  const c = CROPS[id];
  if (c) {
    const { width, height } = await sharp(src).metadata();
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
