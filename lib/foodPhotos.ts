import { DRAWN_FOODS, DRAWN_SKIP } from "./foodDrawings";

/**
 * A real photo of a food AT ITS CARD'S AMOUNT, for the cards that name no
 * household measure ("Two eggs", "Half of one medium banana"). Founder and
 * co-founder dietitian, 2026-10-08: the photo must show the same food in the
 * same count; it may be cropped to the right number; a food with no honest
 * photo keeps its drawing. Free Unsplash (u) and Pexels (p) photos only, each
 * counted before use, and the founder's own photos (2026-10-09). Made by
 * scripts/food-photos.mjs.
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
  // Fruit measured as itself, not in cups (founder, 2026-10-08).
  apple: { alt: "One small apple held in two hands", source: "p 14662513" },
  mango: { alt: "Half of one mango", source: "p 5750461" },
  pineapple: { alt: "One round slice of pineapple held in a hand", source: "p 784897" },
  jackfruit: { alt: "Three yellow pieces of jackfruit", source: "p 5620864" },
  pomegranate: { alt: "Half of one pomegranate, full of seeds", source: "p 11633656" },
  watermelon: { alt: "Six pieces of watermelon on a plate", source: "p 17778854" },
  // Foods eaten in pieces shown as themselves, not a palm (founder, 2026-10-08).
  chicken: { alt: "Two grilled chicken drumsticks on a plate", source: "p 24549214" },
  fish: { alt: "One piece of grilled fish on a plate", source: "p 15146204" },
  "fried-egg": { alt: "Two fried eggs on a plate", source: "p 8992926" },
  tofu: { alt: "One block of tofu held in a hand", source: "p 9324367" },
  "irish-potato": { alt: "Two small potatoes", source: "p 11633655" },
  crab: { alt: "One cooked crab", source: "p 34640570" },
  coconut: { alt: "Two pieces of coconut", source: "p 14966550" },

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

  // Only branded photos exist of these. The brand names and logos are blurred
  // out (founder, 2026-10-08); the food itself stays sharp. See BLUR in
  // scripts/food-photos.mjs.
  "energy-drink": { alt: "A can of energy drink on ice, its label blurred", skip: true, source: "u EqEhi4KmqbI, logo blurred" },
  "condensed-milk": { alt: "A tin of condensed milk, its label blurred", skip: true, source: "u DYBE_iR0wng, label blurred" },
  "seasoning-cube": { alt: "One wrapped seasoning cube", source: "p 4197990, print blurred" },

  // The founder's own photos (2026-10-09), one per food, each counted against
  // its card before use. Cropped by BOX in scripts/food-photos.mjs.
  suya: { alt: "One stick of suya with six pieces of meat", source: "founder" },
  kilishi: { alt: "Three pieces of kilishi on a plate", source: "founder" },
  boli: { alt: "Half of one roasted plantain on a plate", source: "founder" },
  "puff-puff": { alt: "One puff-puff on a plate", source: "founder" },
  buns: { alt: "One bun on a plate", source: "founder" },
  doughnut: { alt: "Half of one doughnut on a plate", source: "founder" },
  cake: { alt: "One thin slice of cake on a plate", source: "founder" },
  masa: { alt: "Two masa cakes on a plate", source: "founder" },
  "kuli-kuli": { alt: "Two sticks of kuli kuli on a plate", source: "founder" },
  ojojo: { alt: "Three ojojo fritters on a dish", source: "founder" },
  "egg-roll": { alt: "One egg roll on a plate", source: "founder" },
  samosa: { alt: "One samosa on a plate", source: "founder" },
  "spring-roll": { alt: "One spring roll on a plate", source: "founder" },
  "small-chops": { alt: "Four pieces of small chops on a plate", source: "founder" },
  donkwa: { alt: "Two balls of donkwa beside a thumb", source: "founder" },
  kokoro: { alt: "Four sticks of kokoro on a plate", source: "founder" },
  aadun: { alt: "One piece of aadun on a plate", source: "founder" },
  robo: { alt: "Three pieces of robo on a plate", source: "founder" },
  "coconut-candy": { alt: "One small piece of coconut candy on a plate", source: "founder" },
  pancakes: { alt: "Two small pancakes on a plate", source: "founder" },
  "chocolate-bar": { alt: "Two small squares of chocolate on a plate", source: "founder" },
  "peanut-candy": { alt: "One small piece of peanut candy on a plate", source: "founder" },
  "baba-dudu": { alt: "One piece of baba dudu on a plate", source: "founder" },
  alkaki: { alt: "One piece of alkaki on a plate", source: "founder" },
  beef: { alt: "Two chunks of beef on a plate", source: "founder" },
  "goat-meat": { alt: "Two chunks of goat meat on a plate", source: "founder" },
  turkey: { alt: "One piece of turkey on a plate", source: "founder" },
  snail: { alt: "Three snails on a plate", source: "founder" },
  "prawns-crayfish": { alt: "About 10 cooked prawns on a plate", source: "founder" },
  pomo: { alt: "Two small pieces of pomo on a plate", source: "founder" },
  liver: { alt: "One slice of liver on a plate", source: "founder" },
  "fried-chicken-fish": { alt: "One fried chicken leg on a plate", source: "founder" },
  "dambu-nama": { alt: "Shredded dried meat on a plate", source: "founder" },
  periwinkle: { alt: "Fifteen periwinkles on a plate", source: "founder" },
  stockfish: { alt: "One piece of stockfish on a plate", source: "founder" },
  shaki: { alt: "Two pieces of shaki on a plate", source: "founder" },
  gizzard: { alt: "Six pieces of gizzard on a plate", source: "founder" },
  grasscutter: { alt: "Two chunks of grasscutter meat on a plate", source: "founder" },
  "beef-regular": { alt: "Two chunks of meat on a plate", source: "founder" },
  "scrambled-egg": { alt: "Two scrambled eggs with pepper and onion on a plate", source: "founder" },
  "egg-sauce": { alt: "Egg sauce with tomato, pepper and onion on a plate", source: "founder" },
  asun: { alt: "Two chunks of asun held in a hand", source: "founder" },
  "ram-meat": { alt: "Two chunks of ram meat held in a hand", source: "founder" },
  kidney: { alt: "Pieces of kidney filling a palm", source: "founder" },
  bacon: { alt: "Two rashers of bacon", source: "founder" },
  "cow-leg": { alt: "One piece of cow leg on a plate", source: "founder" },
  "cow-tail": { alt: "One piece of cow tail on a plate", source: "founder" },
  "smoked-fish": { alt: "One piece of smoked fish on a plate", source: "founder" },
  sausage: { alt: "One sausage on a plate", source: "founder" },
  pawpaw: { alt: "Four pieces of pawpaw on a plate", source: "founder" },
  soursop: { alt: "Four pieces of white soursop flesh on a plate", source: "founder" },
  ube: { alt: "Two ube pears on a plate", source: "founder" },
  sugarcane: { alt: "One small piece of sugarcane on a plate", source: "founder" },
  grapes: { alt: "About 15 green grapes on a plate", source: "founder" },
  "golden-melon": { alt: "Six pieces of melon on a plate", source: "founder" },
  "monkey-kola": { alt: "Two monkey kola fruits on a plate", source: "founder" },
  pomelo: { alt: "Three peeled pomelo segments on a plate", source: "founder" },
  sweetsop: { alt: "Half of one sweetsop on a plate", source: "founder" },
  "hog-plum": { alt: "One hog plum on a plate", source: "founder" },
  fig: { alt: "Two fresh figs on a plate", source: "founder" },
  groundnut: { alt: "About 20 groundnuts on a plate", source: "founder" },
  walnut: { alt: "Seven whole walnuts on a plate", source: "founder" },
  "bitter-kola": { alt: "One bitter kola seed on a plate", source: "founder" },
  "kola-nut": { alt: "One lobe of kola nut on a plate", source: "founder" },
  ugu: { alt: "Ugu leaves", source: "founder" },
  waterleaf: { alt: "A bunch of waterleaf", source: "founder" },
  "okra-veg": { alt: "Eight okra fingers", source: "founder" },
  "scent-leaf": { alt: "A bunch of scent leaf", source: "founder" },
  lettuce: { alt: "Six big lettuce leaves", source: "founder" },
  "bitterleaf-veg": { alt: "Washed bitter leaf on a plate", source: "founder" },
  broccoli: { alt: "Eight small pieces of broccoli on a plate", source: "founder" },
  cauliflower: { alt: "Eight small pieces of cauliflower on a plate", source: "founder" },
  beetroot: { alt: "Two slices of beetroot", source: "founder" },
  mushroom: { alt: "Nine cooked mushrooms", source: "founder" },
  zucchini: { alt: "Half of one cooked zucchini", source: "founder" },
  celery: { alt: "One stalk of celery", source: "founder" },
  akara: { alt: "Three akara balls", source: "founder" },
  dodo: { alt: "Three slices of fried plantain", source: "founder" },
  "boiled-yam": { alt: "Two pieces of boiled yam", source: "founder" },
  "fried-yam": { alt: "Two pieces of fried yam", source: "founder" },
  "roasted-yam": { alt: "Two pieces of roasted yam", source: "founder" },
  "sweet-potato": { alt: "One boiled sweet potato on a plate", source: "founder" },
  cocoyam: { alt: "Two pieces of boiled cocoyam", source: "founder" },
  "boiled-water-yam": { alt: "Two pieces of boiled water yam", source: "founder" },
  "boiled-corn": { alt: "Half of one boiled corn cob on a plate", source: "founder" },
  "roasted-corn": { alt: "Half of one roasted corn cob on a plate", source: "founder" },
  "coconut-bread": { alt: "One thin slice of bread on a plate", source: "founder" },
  baguette: { alt: "One short piece of French bread on a plate", source: "founder" },
  "eko-agidi": { alt: "One wrap of eko on a plate", source: "founder" },
  weetabix: { alt: "Two wheat cereal biscuits on a plate", source: "founder" },
  "chin-chin": { alt: "Pieces of chin chin on a plate", source: "founder" },
  "cassava-chips": { alt: "Cassava chips spread on a plate", source: "founder" },
  "cashew-nut": { alt: "Cashew nuts on a plate", source: "founder" },
  "tiger-nut": { alt: "Whole tiger nuts on a plate", source: "founder" },
  "mixed-nuts": { alt: "Mixed nuts on a plate", source: "founder" },
  "fruit-salad": { alt: "Small pieces of fresh fruit on a plate", source: "founder" },
  "green-beans": { alt: "Green beans laid out in a fan", source: "founder" },
  "boiled-plantain-ripe": { alt: "Two slices of boiled ripe plantain", source: "founder" },
  "boiled-plantain-unripe": { alt: "Three thick slices of boiled unripe plantain on a plate", source: "founder" },
  sardine: { alt: "Two sardines on a plate", source: "founder" },
  "fish-roll": { alt: "One fish roll on a plate", source: "founder" },
  "velvet-tamarind": { alt: "About 10 velvet tamarind pods on a plate, two of them opened", source: "founder" },
  soko: { alt: "Green soko leaves on a plate", source: "founder" },
  agbalumo: { alt: "One agbalumo with its leaves on a plate", source: "founder" },
  // The 9 that showed a measure instead of the food (2026-10-10).
  gizdodo: { alt: "Five pieces of gizzard and three slices of fried plantain on a plate", source: "founder" },
  nkwobi: { alt: "Three pieces of cow foot in a spicy sauce, with onion and leaves", source: "founder" },
  "moi-moi": { alt: "One moi moi wrapped in a leaf on a plate", source: "founder" },
  okpa: { alt: "One okpa on its open leaf on a plate", source: "founder" },
  ekuru: { alt: "One ekuru on a leaf on a plate", source: "founder" },
  "dan-wake": { alt: "Eight small bean dumplings on a plate", source: "founder" },
  "beans-and-plantain": { alt: "A small glass of cooked beans and two pieces of boiled plantain", source: "founder" },
  wara: { alt: "Three small pieces of wara on a plate", source: "founder" },
  "nigerian-salad": { alt: "One cup and half a cup of Nigerian salad in two glasses", source: "founder" },
  "canned-fruit": { alt: "An open tin of fruit in syrup", skip: true, source: "founder" },
  "malt-drink": { alt: "A glass of malt drink", skip: true, source: "founder" },
  "sugarcane-juice": { alt: "A glass of sugarcane juice", skip: true, source: "founder" },
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
