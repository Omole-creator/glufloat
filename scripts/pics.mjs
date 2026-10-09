import sharp from "sharp";

const root = "..";

// Testimonial avatars: square, 320px
for (let i = 1; i <= 5; i++) {
  await sharp(`${root}/pic${i}.jfif`)
    .rotate()
    .resize(320, 320, { fit: "cover", position: "attention" })
    .jpeg({ quality: 82 })
    .toFile(`public/img/pic${i}.jpg`);
  console.log(`pic${i}.jpg written`);
}

// Founder portrait: taller crop
await sharp(`${root}/pic6.jpg`)
  .rotate()
  .resize(560, 640, { fit: "cover", position: "attention" })
  .jpeg({ quality: 84 })
  .toFile("public/img/founder.jpg");
console.log("founder.jpg written");

// Co-founder portrait (Favour Chiamaka), same size as the founder's. Cropped
// from the top: her face sits high in the photo.
await sharp(`${root}/favour.jpg`)
  .rotate()
  .resize(560, 640, { fit: "cover", position: "top" })
  .jpeg({ quality: 84 })
  .toFile("public/img/cofounder-favour.jpg");
console.log("cofounder-favour.jpg written");
