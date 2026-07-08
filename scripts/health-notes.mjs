// Dietician feedback: many people with diabetes also have high blood pressure,
// high cholesterol, or kidney problems. A food that is fine for sugar (red or
// organ meat, salty or fried food, oily soup) can still harm them. This pass
// sets a red-box `healthNote` on those foods only, worded in very plain words.
//
// Detection looks at the food's OWN identity (name + aliases + category), never
// its pairing or logic text, so a food that merely mentions a fried side (pap
// eaten with akara) or says "not fried" is not flagged. Word boundaries stop
// "kidney" matching "kidney beans" and "ram" matching "caramel". The pass is
// idempotent: it clears any old note that no longer applies.
import { readFileSync, writeFileSync } from "node:fs";

const FILE = "data/foods.json";
const foods = JSON.parse(readFileSync(FILE, "utf8"));

const NOTES = {
  meat:
    "Beef and goat are red meat. Liver, kidney, shaki, and pomo are organ meat. Both are fine for your sugar but not for everyone. If you have high blood pressure, high cholesterol, or kidney problems, pick fish or skinless chicken instead and use less salt.",
  salt:
    "This food is very salty. If you have high blood pressure, high cholesterol, or kidney problems, use only a little. Too much salt harms your heart and kidneys even when your sugar is fine.",
  oil:
    "This food is fried or heavy with oil. If you have high blood pressure, high cholesterol, or kidney problems, keep it small and use less oil. Boiled or grilled is better.",
  dishOil:
    "This dish is cooked with a lot of palm oil. If you have high blood pressure, high cholesterol, or kidney problems, use less oil and go easy on the red meat.",
  fat:
    "This is high in fat that can raise your cholesterol. If you have high cholesterol, high blood pressure, or heart trouble, use only a little at a time.",
  kidney:
    "Do not eat this if you have kidney problems. Star fruit has a natural poison that strong kidneys clear but weak kidneys cannot, and it can make a kidney patient very sick.",
};

// Specific foods that need a note their keywords do not catch.
const KIDNEY_IDS = new Set(["star-fruit"]);
// Saturated or heavy fats that raise cholesterol (oils, butter, full-fat dairy).
const FAT_IDS = new Set([
  "butter", "coconut-oil", "palm-oil", "mayonnaise", "milk-full-cream",
  "evaporated-milk", "wara",
]);
// Very salty foods whose role blocks the keyword scan (noodles, iru, canned).
const SALT_IDS = new Set(["indomie", "locust-bean", "baked-beans"]);
// Cooked dishes heavy with palm oil that are not soups.
const OIL_IDS = new Set(["native-rice", "abacha"]);

// Red and organ meat. Only checked on meaty roles.
const MEAT_ROLES = new Set(["protein", "soup", "snack"]);
const MEAT_WORDS = [
  "beef", "goat", "goat meat", "mutton", "ram", "ram meat", "oxtail", "liver",
  "kidney", "gizzard", "tripe", "shaki", "saki", "ponmo", "kpomo", "pomo",
  "cow leg", "cow foot", "cow tail", "cow skin", "cow head", "isi ewu",
  "nkwobi", "offal", "assorted meat", "assorted", "suya", "kilishi", "asun",
  "balangu", "tsire", "dambu", "bush meat", "grasscutter", "abodi", "corned beef",
  "pork", "bacon", "ham",
];

// Salty or heavily processed foods.
const SALT_ROLES = new Set(["protein", "condiment", "soup", "snack", "fat"]);
const SALT_WORDS = [
  "stockfish", "okporoko", "panla", "dried fish", "smoked fish", "crayfish",
  "sausage", "hot dog", "seasoning", "maggi", "knorr", "bouillon", "stock cube",
  "sardine", "salt", "salted",
];

// Fried, oily, or greasy foods (any role). Includes the snack names themselves
// so a food that is fried is caught even when its name lacks the word "fried".
const FRIED_WORDS = [
  "fried", "deep fry", "deep-fry", "dodo", "gizdodo", "akara", "puff puff",
  "chin chin", "chips", "crisps", "fries", "french fries", "kuli kuli", "ojojo",
  "samosa", "spring roll", "egg roll", "fish roll", "meat pie", "sausage roll",
  "doughnut", "donut", "small chops", "boli", "kokoro", "buns", "scotch egg",
  "gala", "burger", "robo", "alkaki",
];

// Oily or fatty soups (only checked on soups).
const OILY_SOUP_WORDS = [
  "banga", "palm oil", "palm-oil", "egusi", "groundnut", "ofe akwu", "ofada",
  "ayamase", "native soup", "fisherman", "owho", "draw soup", "designer",
];

function identity(f) {
  return `${f.name} ${(f.aliases || []).join(" ")} ${f.category}`.toLowerCase();
}

function hasAny(text, words) {
  const re = new RegExp(
    "\\b(" + words.map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|") + ")\\b",
    "i",
  );
  return re.test(text);
}

// Foods a keyword catches only through a side alias, while the food itself is
// lean or boiled (turkey "turkey suya", coconut "coconut chips", chickpeas
// "fried chickpeas", beans-and-plantain "ewa ati dodo").
const EXCLUDE_IDS = new Set([
  "turkey",
  "coconut",
  "chickpeas",
  "beans-and-plantain",
]);

function noteFor(f) {
  if (EXCLUDE_IDS.has(f.id)) return null;
  if (KIDNEY_IDS.has(f.id)) return NOTES.kidney;
  const text = identity(f);
  if (MEAT_ROLES.has(f.role) && hasAny(text, MEAT_WORDS)) return NOTES.meat;
  if (SALT_IDS.has(f.id) || (SALT_ROLES.has(f.role) && hasAny(text, SALT_WORDS)))
    return NOTES.salt;
  if (FAT_IDS.has(f.id)) return NOTES.fat;
  const friedSnack = hasAny(text, FRIED_WORDS);
  const oilyDish =
    OIL_IDS.has(f.id) || (f.role === "soup" && hasAny(text, OILY_SOUP_WORDS));
  // Soups and oily cooked dishes get the "cooked with palm oil" note; only true
  // fried snacks get the "boiled or grilled is better" note.
  if (f.role === "soup" && (friedSnack || oilyDish)) return NOTES.dishOil;
  if (friedSnack) return NOTES.oil;
  if (oilyDish) return NOTES.dishOil;
  return null;
}

const applied = [];
for (const f of foods) {
  const note = noteFor(f);
  if (note) {
    f.healthNote = note;
    const kind = Object.keys(NOTES).find((k) => NOTES[k] === note);
    applied.push(`${f.id} [${f.role}] -> ${kind}`);
  } else if ("healthNote" in f) {
    delete f.healthNote; // clear a note that no longer applies
  }
}

writeFileSync(FILE, JSON.stringify(foods, null, 2) + "\n");
console.log(`health notes on ${applied.length} foods:`);
console.log(applied.join("\n"));
