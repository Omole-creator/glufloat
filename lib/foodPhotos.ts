import { DRAWN_FOODS, DRAWN_SKIP } from "./foodDrawings";

/**
 * A real photo of a food AT ITS CARD'S AMOUNT, for the cards that name no
 * household measure ("Two eggs", "Half of one medium banana"). Founder and
 * co-founder dietitian, 2026-10-08: the photo must show the same food in the
 * same count; it may be cropped to the right number; a food with no honest
 * photo keeps its drawing. Free Unsplash (u) and Pexels (p) photos only, each
 * counted before use. Made by scripts/food-photos.mjs.
 *
 * `skip` puts the red circle-and-line over a food the card says to have none
 * of ("None at all"); a food with a small fallback amount shows that amount.
 *
 * `alt` says what is literally in the photo.
 */
export interface FoodPhoto {
  alt: string;
  skip?: boolean;
  /** Source, for the record: site and photo id. */
  source: string;
}

export const FOOD_PHOTOS: Record<string, FoodPhoto> = {
  eggs: { alt: "Two brown eggs", source: "p 6576811" },
  "agege-bread": { alt: "One slice of white bread", source: "p 8599593" },
  "whole-wheat-bread": { alt: "One slice of brown bread", source: "p 7936664" },
  avocado: { alt: "Half an avocado with its seed", source: "p 30872506" },
  orange: { alt: "One orange", source: "p 7214901" },
  tangerine: { alt: "One tangerine with leaves", source: "p 19827322" },
  grapefruit: { alt: "Half a grapefruit", source: "p 37060183" },
  kiwi: { alt: "One kiwi", source: "p 6156986" },
  dates: { alt: "One date", source: "p 12042619" },
  "passion-fruit": { alt: "Two passion fruits", source: "p 6332803" },
  guava: { alt: "One guava with a leaf", source: "p 39852867" },
  "star-fruit": { alt: "One star fruit", source: "p 36506739" },
  banana: { alt: "Half a banana", source: "p 7195056" },
  mulberry: { alt: "About 13 mulberries in a hand", source: "p 35071181" },
  almond: { alt: "About 20 almonds", source: "u hw8vOPAIZgk" },
  "cashew-fruit": { alt: "One cashew fruit held in a hand", source: "p 34626408" },
  "garden-egg": { alt: "Three garden eggs held in two hands", source: "p 28930676" },
  carrot: { alt: "Two carrots on a plate", source: "p 7331977" },
  tomato: { alt: "Three tomatoes", source: "p 6060865" },
  "bell-pepper": { alt: "Two yellow peppers", source: "p 7656864" },
  onion: { alt: "One red onion held in a hand", source: "p 7129162" },
  cucumber: { alt: "One cucumber", source: "p 18297019" },
  strawberry: { alt: "Seven strawberries", source: "p 1350964" },
  "lime-lemon": { alt: "A hand squeezing a lemon into a bowl", source: "p 10432421" },
  ginger: { alt: "Ginger roots", source: "p 10112136" },
  garlic: { alt: "Bulbs of garlic", source: "p 1392585" },
  spinach: { alt: "Fresh spinach leaves in a bowl", source: "p 2325843" },
  "pepper-chili": { alt: "One red chili pepper", source: "u nZUQgW0FVnc" },
  omelette: { alt: "One omelette with vegetables on a plate", source: "p 11654228" },
  "scotch-egg": { alt: "One scotch egg cut open", source: "p 7491951" },
  "club-sandwich": { alt: "One sandwich cut in two", source: "p 5006444" },
  biscuits: { alt: "Two biscuits on a plate", source: "p 39141871" },
  burger: { alt: "One small burger", source: "p 11136306" },
  "ice-cream": { alt: "One small scoop of ice cream in a cup", source: "p 9227723" },
  "meat-pie": { alt: "Half of one meat pie", source: "p 39070766" },
  pizza: { alt: "One thin slice of pizza", source: "p 15891391" },
  "hot-dog": { alt: "One hot dog in a bun", source: "p 5225476" },
  waffles: { alt: "One small waffle on a plate", source: "p 36999578" },
  jam: { alt: "One slice of toast with a thin layer of jam", source: "p 33301772" },
  "chocolate-spread": { alt: "One slice of bread with a thin layer of spread", source: "p 5566235" },
  shawarma: { alt: "Half of one shawarma", source: "p 5779364" },
  "potato-crisps": { alt: "About 10 crisps", source: "p 8344911" },
  "plantain-chips": { alt: "About 15 plantain chips", source: "u El7BbLDQ2SY" },
  "french-fries": { alt: "About 10 chips", source: "p 18866155" },
  "sausage-roll": { alt: "One sausage roll broken open", source: "p 5501156" },
  beer: { alt: "One bottle of beer", source: "p 8762537" },

  "soft-drink": { alt: "A can of soft drink", skip: true, source: "p 7033796" },
  "fruit-juice": { alt: "A glass of orange juice", skip: true, source: "p 8882541" },
  "milo-bournvita": { alt: "A cup of chocolate drink", skip: true, source: "p 28445280" },
  "table-sugar": { alt: "Sugar cubes on a spoon", skip: true, source: "p 19243767" },
  chapman: { alt: "A glass of red fruit punch", skip: true, source: "p 17320905" },
  "zobo-sweetened": { alt: "A glass of red zobo drink", skip: true, source: "p 32566386" },
  honey: { alt: "A jar of honey", skip: true, source: "p 39197566" },
  "flavoured-milk": { alt: "A glass of strawberry milk", skip: true, source: "p 8284685" },
  "local-gin": { alt: "A glass of clear spirit", skip: true, source: "p 31328176" },
  lacasera: { alt: "A glass of sparkling apple drink", skip: true, source: "p 11632350" },
  "sweetened-yogurt": { alt: "Yogurt with cherries in syrup", skip: true, source: "p 39584090" },
};

/**
 * The picture for a food's amount: its real photo, else its colour drawing
 * (scripts/food-drawings.mjs, for the foods with no honest photo; founder:
 * "colourful and not colourless or sketchy"), else nothing.
 */
export function foodPhotoFor(
  id: string,
): (FoodPhoto & { photo: string; drawing?: boolean }) | undefined {
  const p = FOOD_PHOTOS[id];
  if (p) return { ...p, photo: `/img/food-portions/${id}.jpg` };
  if (DRAWN_FOODS.includes(id)) {
    return {
      alt: "A drawing of the right amount",
      skip: DRAWN_SKIP.includes(id),
      source: "drawing",
      photo: `/img/food-drawings/${id}.svg`,
      drawing: true,
    };
  }
  return undefined;
}
