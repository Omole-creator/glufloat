import sharp from "sharp";

const src = "public/img/_c2.jpg";
const meta = await sharp(src).metadata();
console.log("src:", meta.width, "x", meta.height);

// She sits center-left in the landscape frame. Crop a portrait box around her.
const w = Math.round(meta.width * 0.5); // ~half width
const left = Math.round(meta.width * 0.08);
const top = Math.round(meta.height * 0.14);
const h = Math.min(meta.height - top, Math.round(w * 1.25));

await sharp(src)
  .rotate()
  .extract({ left, top, width: w, height: h })
  .resize(600, 720, { fit: "cover", position: "top" })
  .jpeg({ quality: 85 })
  .toFile("public/img/joy-woman.jpg");
console.log("joy-woman.jpg written from", w, "x", h);
