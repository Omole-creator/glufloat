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
  // Foods eaten in pieces shown as themselves (founder, 2026-10-08).
  chicken: { left: 0.18, top: 0.56, width: 0.45, height: 0.36, pad: true },
  coconut: { left: 0.29, top: 0.255, width: 0.44, height: 0.185, pad: true },
  fish: { left: 0.02, top: 0.3, width: 0.86, height: 0.5, pad: true },
  crab: { left: 0.05, top: 0.1, width: 0.9, height: 0.8, pad: true },
  "fried-egg": { left: 0, top: 0, width: 1, height: 1, pad: true },
  tofu: { left: 0.2, top: 0.3, width: 0.6, height: 0.4, pad: true },
  "irish-potato": { left: 0.05, top: 0.05, width: 0.9, height: 0.9, pad: true },
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


/**
 * The founder's own photos (2026-10-09), one per food, each counted against
 * its card before use. `BOX` is the food in the photo (left, top, width,
 * height, as fractions). The output is the smallest square around it, so a
 * neighbour, a hand or a bowl of extra meat behind the plate stays out. When
 * that square would not fit, or would take in the words printed under the
 * food (`pad`), the box itself is set on a plain background instead.
 */
const BOX = {
  suya: [0.12, 0.3, 0.76, 0.4],
  kilishi: [0.14, 0.2, 0.72, 0.65],
  boli: [0.34, 0.3, 0.36, 0.45],
  "puff-puff": [0.33, 0.27, 0.33, 0.47],
  buns: [0.33, 0.27, 0.33, 0.47],
  doughnut: [0.3, 0.3, 0.42, 0.42],
  cake: [0.36, 0.18, 0.28, 0.56],
  masa: [0.27, 0.3, 0.46, 0.44],
  "kuli-kuli": [0.22, 0.2, 0.56, 0.48],
  ojojo: [0.14, 0.2, 0.74, 0.7],
  "egg-roll": [0.33, 0.24, 0.34, 0.52],
  samosa: [0.33, 0.2, 0.33, 0.55],
  "spring-roll": [0.27, 0.3, 0.46, 0.44],
  "small-chops": [0.24, 0.25, 0.53, 0.6],
  // The thumb stays in: the card says each piece is the size of your thumb.
  donkwa: [0.33, 0.25, 0.65, 0.55],
  kokoro: [0.24, 0.35, 0.49, 0.4],
  aadun: [0.31, 0.25, 0.37, 0.5],
  robo: [0.27, 0.25, 0.43, 0.5],
  "coconut-candy": [0.28, 0.22, 0.42, 0.55],
  pancakes: [0.3, 0.25, 0.42, 0.52],
  "chocolate-bar": [0.32, 0.3, 0.34, 0.42],
  "peanut-candy": [0.33, 0.28, 0.33, 0.45],
  "baba-dudu": [0.36, 0.25, 0.26, 0.45],
  alkaki: [0.36, 0.27, 0.26, 0.45],
  beef: [0.31, 0.25, 0.38, 0.5],
  "goat-meat": [0.3, 0.25, 0.4, 0.5],
  turkey: [0.29, 0.18, 0.43, 0.55],
  snail: [0.3, 0.24, 0.38, 0.48],
  "prawns-crayfish": [0.27, 0.27, 0.44, 0.5],
  pomo: [0.34, 0.32, 0.34, 0.42],
  liver: [0.27, 0.3, 0.46, 0.45],
  // The photo holds a chicken leg AND a fish; the card is ONE piece, so only the leg.
  "fried-chicken-fish": [0.22, 0.3, 0.3, 0.55],
  "dambu-nama": [0.27, 0.24, 0.5, 0.6],
  periwinkle: [0.27, 0.2, 0.46, 0.6],
  stockfish: [0.37, 0.39, 0.27, 0.32, "pad"],
  // A hand rests by the plate in these: the box stays clear of the fingers.
  shaki: [0.34, 0.3, 0.32, 0.36, "pad"],
  // A bowl of more gizzard and grasscutter sits behind the plate: kept out.
  gizzard: [0.32, 0.3, 0.34, 0.42, "pad"],
  grasscutter: [0.33, 0.28, 0.32, 0.4, "pad"],
  "beef-regular": [0.34, 0.3, 0.32, 0.38, "pad"],
  "scrambled-egg": [0.27, 0.29, 0.48, 0.5, "pad"],
  "egg-sauce": [0.18, 0.2, 0.62, 0.68],
  asun: [0.24, 0.12, 0.52, 0.72],
  "ram-meat": [0.28, 0.15, 0.5, 0.65],
  kidney: [0.05, 0.1, 0.85, 0.85],
  // An open tin of sardines sits top left: kept out.
  bacon: [0.21, 0.31, 0.62, 0.52],
  "cow-leg": [0.28, 0.2, 0.44, 0.55],
  "cow-tail": [0.31, 0.2, 0.4, 0.58],
  "smoked-fish": [0.3, 0.2, 0.44, 0.56],
  sausage: [0.31, 0.3, 0.42, 0.45],
  pawpaw: [0.31, 0.22, 0.4, 0.52],
  soursop: [0.31, 0.22, 0.4, 0.52],
  ube: [0.26, 0.18, 0.5, 0.6],
  sugarcane: [0.33, 0.22, 0.36, 0.5],
  grapes: [0.32, 0.2, 0.38, 0.52],
  "golden-melon": [0.3, 0.22, 0.4, 0.54],
  "monkey-kola": [0.3, 0.25, 0.38, 0.47],
  pomelo: [0.31, 0.2, 0.42, 0.55],
  sweetsop: [0.3, 0.12, 0.4, 0.62],
  "hog-plum": [0.34, 0.22, 0.32, 0.48],
  fig: [0.32, 0.2, 0.38, 0.5],
  "canned-fruit": [0.2, 0, 0.6, 1],
  groundnut: [0.2, 0.08, 0.6, 0.86],
  walnut: [0.2, 0.08, 0.6, 0.86],
  "bitter-kola": [0.34, 0.25, 0.32, 0.45],
  "kola-nut": [0.36, 0.27, 0.28, 0.45],
  ugu: [0.03, 0.03, 0.94, 0.94],
  waterleaf: [0.17, 0.03, 0.68, 0.94],
  "okra-veg": [0.06, 0.1, 0.86, 0.8],
  lettuce: [0.05, 0.05, 0.9, 0.9],
  broccoli: [0.03, 0.25, 0.94, 0.45],
  cauliflower: [0.05, 0.3, 0.9, 0.45],
  mushroom: [0.28, 0.12, 0.42, 0.86],
  "boiled-yam": [0.33, 0.25, 0.34, 0.46],
  "fried-yam": [0.33, 0.25, 0.34, 0.46],
  "roasted-yam": [0.33, 0.25, 0.34, 0.46],
  "sweet-potato": [0.3, 0.2, 0.4, 0.5],
  cocoyam: [0.33, 0.25, 0.34, 0.5],
  "boiled-water-yam": [0.33, 0.27, 0.34, 0.48],
  "boiled-corn": [0.21, 0.18, 0.52, 0.54],
  "roasted-corn": [0.2, 0.2, 0.67, 0.58],
  "coconut-bread": [0.24, 0.28, 0.5, 0.5],
  baguette: [0.32, 0.2, 0.38, 0.52],
  "eko-agidi": [0.32, 0.22, 0.38, 0.5],
  weetabix: [0.27, 0.25, 0.46, 0.45],
  "malt-drink": [0.32, 0.12, 0.36, 0.7],
  "sugarcane-juice": [0.3, 0.15, 0.4, 0.7],
  // Added 2026-10-09 on the founder's word: the count is written on the card.
  "chin-chin": [0.24, 0.28, 0.53, 0.5],
  "cassava-chips": [0.17, 0.17, 0.67, 0.66],
  "cashew-nut": [0.2, 0.08, 0.6, 0.86],
  "tiger-nut": [0.2, 0.08, 0.6, 0.86],
  "mixed-nuts": [0.2, 0.08, 0.6, 0.86],
  "fruit-salad": [0.27, 0.18, 0.46, 0.55],
  "green-beans": [0.02, 0.08, 0.96, 0.86],
  // The 6 retaken photos (2026-10-09).
  "boiled-plantain-unripe": [0.29, 0.13, 0.42, 0.62],
  sardine: [0.26, 0.55, 0.5, 0.28, "pad"],
  "fish-roll": [0.18, 0.46, 0.5, 0.4],
  "velvet-tamarind": [0.2, 0.36, 0.52, 0.44],
  soko: [0.23, 0.32, 0.5, 0.5],
  // Loose seeds lie beside the plate: kept out.
  agbalumo: [0.17, 0.3, 0.45, 0.48],
  // Words are printed under the food in these: the box stops above them.
  beetroot: [0.22, 0.18, 0.57, 0.57, "pad"],
  zucchini: [0.25, 0.2, 0.5, 0.5, "pad"],
  celery: [0.22, 0.08, 0.57, 0.74, "pad"],
  akara: [0.3, 0.14, 0.4, 0.62, "pad"],
  dodo: [0.31, 0.15, 0.38, 0.55, "pad"],
  "boiled-plantain-ripe": [0.33, 0.22, 0.34, 0.48, "pad"],
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
  let c = CROPS[id];
  if (BOX[id]) {
    const { width: W, height: H } = await sharp(src).metadata();
    const [l, t, w, h, pad] = BOX[id];
    const side = Math.max(w * W, h * H);
    if (pad || side > Math.min(W, H)) {
      c = { left: l, top: t, width: w, height: h, pad: true };
    } else {
      // The smallest square around the food, slid back inside the photo.
      const cx = (l + w / 2) * W, cy = (t + h / 2) * H;
      const x = Math.min(Math.max(cx - side / 2, 0), W - side);
      const y = Math.min(Math.max(cy - side / 2, 0), H - side);
      c = { left: x / W, top: y / H, width: side / W, height: side / H };
    }
  }
  if (c) {
    const { width, height } = await sharp(src).metadata();
    const left = Math.round(width * c.left), top = Math.round(height * c.top);
    img = img.extract({
      left,
      top,
      width: Math.min(Math.round(width * c.width), width - left),
      height: Math.min(Math.round(height * c.height), height - top),
    });
  }
  if (c?.pad) {
    const fg = await img.resize(720, 720, { fit: "inside" }).toBuffer();
    const meta = await sharp(fg).metadata();
    // A plain colour from the cut itself, never a blurred copy of the whole
    // photo: that showed blurry extra dates behind the one date, which reads
    // as "more than one".
    let { dominant: background } = await sharp(fg).stats();
    // The founder's photos: a plain light band, the colour of the plates
    // they are shot on, rather than a muddy mix of plate and table.
    if (BOX[id]) background = { r: 244, g: 242, b: 238 };
    await sharp({ create: { width: 720, height: 720, channels: 3, background } })
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
