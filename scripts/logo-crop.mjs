import sharp from "sharp";
import { mkdirSync } from "node:fs";

const src = "../logor-removebg-preview.png";
mkdirSync("public", { recursive: true });

// Full logo (mark + wordmark), trimmed of transparent padding
await sharp(src).trim().toFile("public/logo-full.png");

const meta = await sharp(src).metadata();
console.log("source:", meta.width, "x", meta.height);

// The G mark occupies the upper portion; wordmark sits in the lower band.
// Crop upper 62% then trim transparent edges to isolate the mark.
const band = await sharp(src)
  .extract({ left: 0, top: 0, width: meta.width, height: Math.round(meta.height * 0.62) })
  .toBuffer();
const markBand = await sharp(band).trim().toBuffer();

// Square-pad the mark on a transparent canvas and export sizes
const m = await sharp(markBand).metadata();
const size = Math.max(m.width, m.height);
const squared = await sharp(markBand)
  .extend({
    top: Math.floor((size - m.height) / 2),
    bottom: Math.ceil((size - m.height) / 2),
    left: Math.floor((size - m.width) / 2),
    right: Math.ceil((size - m.width) / 2),
    background: { r: 0, g: 0, b: 0, alpha: 0 },
  })
  .toBuffer();

await sharp(squared).resize(512, 512).toFile("public/logo-mark.png");
await sharp(squared).resize(180, 180).toFile("public/apple-touch-icon.png");
await sharp(squared).resize(64, 64).toFile("public/icon.png");
await sharp(squared).resize(32, 32).toFile("app/favicon-new.png");
console.log("mark:", m.width, "x", m.height, "-> logo-mark.png, icons written");
