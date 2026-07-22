import sharp from "sharp";

/**
 * The two photos the founder added on 2026-07-22.
 *
 * Same pattern as pics.mjs / joy.mjs: the source lives at the repo root (which
 * is NOT version-controlled) and is converted into public/img/ here. Nothing
 * ever points at the root file.
 *
 * Note the filenames. `next/image` caches its optimised output keyed by URL, so
 * replacing a picture under a name that has already been served keeps showing
 * the old one. The kitchen photo therefore becomes `kitchen-joy.jpg`, NOT a
 * second `joy-kitchen.jpg`.
 */

// a.png — an older couple eating together. Goes under the three "what you get"
// cards on the landing page, a wide band, so it is cropped landscape.
{
  const src = "../a.png";
  const meta = await sharp(src).metadata();
  console.log("a.png:", meta.width, "x", meta.height);
  // Anchored to the TOP, not the centre. The faces sit right at the top edge of
  // the source, so a centre crop takes the top off his head. Cropping from the
  // bottom instead only loses some of the table.
  await sharp(src)
    .rotate()
    .resize(1400, 980, { fit: "cover", position: "top" })
    .jpeg({ quality: 84 })
    .toFile("public/img/family-meal.jpg");
  console.log("family-meal.jpg written");
}

// aaa.png — a woman behind a full Nigerian table (jollof, efo riro, swallow,
// dodo, plantain, stew). Replaces jollof.jpg in the "Why Glufloat" section, and
// says "our food" far better than a single plate did. Wide, short slot, cropped
// from the top so the headwrap is not clipped.
{
  const src = "../aaa.png";
  const meta = await sharp(src).metadata();
  console.log("aaa.png:", meta.width, "x", meta.height);
  await sharp(src)
    .rotate()
    .resize(1000, 700, { fit: "cover", position: "top" })
    .jpeg({ quality: 84 })
    .toFile("public/img/nigerian-table.jpg");
  console.log("nigerian-table.jpg written");
}

// aa.png — a woman in her kitchen, "Good food, good mood, good life". Replaces
// joy-kitchen.jpg in the joy band, which is a tall near-square slot.
{
  const src = "../aa.png";
  const meta = await sharp(src).metadata();
  console.log("aa.png:", meta.width, "x", meta.height);
  await sharp(src)
    .rotate()
    .resize(760, 720, { fit: "cover", position: "center" })
    .jpeg({ quality: 85 })
    .toFile("public/img/kitchen-joy.jpg");
  console.log("kitchen-joy.jpg written");
}
