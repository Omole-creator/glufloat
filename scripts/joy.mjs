import sharp from "sharp";

const src = "../f14.jpg";
const meta = await sharp(src).metadata();
console.log("src:", meta.width, "x", meta.height);

// Landscape kitchen shot; crop a near-square around her and the food.
await sharp(src)
  .rotate()
  .resize(760, 720, { fit: "cover", position: "center" })
  .jpeg({ quality: 85 })
  .toFile("public/img/joy-kitchen.jpg");
console.log("joy-kitchen.jpg written");
