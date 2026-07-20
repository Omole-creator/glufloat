import type { Food, MealItem, MealResult, Verdict } from "./types";
import { plainFrequency } from "./frequency";
import { SITE_URL } from "./site";

/**
 * Turns a verdict card (or a whole meal) into a plain text message a person can
 * send a relative on WhatsApp. This is how the product travels: someone checks a
 * food for their mother and sends her the real answer.
 *
 * Two founder rules:
 *  - Say what a colour MEANS, never the colour word. "eat with care", never
 *    "YELLOW". The words below are the card's own labels (VerdictCard STYLES /
 *    MealBuilder VERDICT_UI) with the colour word stripped, so there is one
 *    source of truth. Red is "Better to skip" to match the card, not "best to
 *    skip this" (that phrase only lives in per-food portion text).
 *  - Everything on the card goes in, one idea per block, blank line between, so
 *    it reads on a phone. `encodeURIComponent` turns the blank lines into the
 *    spacing WhatsApp shows.
 *
 * No new user-facing copy is authored here: every line reuses a card label or a
 * value already written and audited in the data, so the message can never drift
 * from the card and the plain-words audit is not re-triggered.
 */
const MEANING = {
  green: "Good to eat",
  yellow: "Eat with care",
  red: "Better to skip",
} as const;

const CTA = `Check your own food free: ${SITE_URL}`;

/** One food, mirroring VerdictCard field for field. */
export function foodShareMessage(food: Food): string {
  const blocks: string[] = [`${food.name}. ${MEANING[food.baseVerdict]}.`];

  if (food.logicNote) blocks.push(food.logicNote);
  if (food.healthNote) blocks.push(`Please note: ${food.healthNote}`);
  if (food.medicineNote) blocks.push(`If you take medicine: ${food.medicineNote}`);

  blocks.push(`How much: ${food.portionGuidance}`);

  if (food.carbExchange) {
    blocks.push(
      `One fruit serving (15g carbs): about ${food.carbExchange}. Two servings at once raises your sugar more.`,
    );
  }

  blocks.push(`Eat it with: ${food.pairingAdvice || "Nothing can make this one safe."}`);
  blocks.push(`How often: ${plainFrequency(food)}`);
  blocks.push(CTA);

  return blocks.join("\n\n");
}

/**
 * The "what I ate this month" record a person sends their own doctor. Doctors in
 * Nigeria see a patient briefly and rely on vague self-report; this turns the
 * saved history into a plain, honest summary. It carries only the person's own
 * food, and the colour meanings (never the colour word), same rule as the cards.
 */
export function monthReportMessage(
  counts: { total: number; green: number; yellow: number; red: number },
  items: { label: string; verdict: Verdict }[],
): string {
  const blocks: string[] = ["My food this month, from Glufloat."];

  blocks.push(
    [
      `I checked ${counts.total} ${counts.total === 1 ? "meal" : "meals"} this month.`,
      `Good to eat: ${counts.green}`,
      `Eat with care: ${counts.yellow}`,
      `Better to skip: ${counts.red}`,
    ].join("\n"),
  );

  if (items.length > 0) {
    // A long month can be a lot of lines; keep the message sendable.
    const shown = items.slice(0, 40);
    const lines = shown.map((i) => `- ${i.label} (${MEANING[i.verdict]})`);
    if (items.length > shown.length) {
      lines.push(`- and ${items.length - shown.length} more`);
    }
    blocks.push(["What I ate:", ...lines].join("\n"));
  }

  blocks.push(CTA);

  return blocks.join("\n\n");
}

/** A whole plate, mirroring MealBuilder's "Your answer" card. */
export function mealShareMessage(
  items: MealItem[],
  result: MealResult,
  often: { text: string; reason: string | null } | null,
): string {
  const blocks: string[] = [`Your meal. ${MEANING[result.verdict]}.`, result.headline];

  if (result.breakdown.length > 0) {
    blocks.push(result.breakdown.join("\n"));
  }

  if (result.fixes.length > 0) {
    // A "Note:" line is a health warning, not a step: keep it, but do not number
    // it, exactly as the card renders it.
    let step = 0;
    const lines = result.fixes.map((f) => {
      if (f.startsWith("Note:")) return f;
      step += 1;
      return `${step}. ${f}`;
    });
    blocks.push(["Do this to make it green:", ...lines].join("\n"));
  }

  const healthNotes = [
    ...new Set(items.map((i) => i.food.healthNote).filter((n): n is string => Boolean(n))),
  ];
  for (const n of healthNotes) blocks.push(`Please note: ${n}`);

  const medicineNotes = [
    ...new Set(items.map((i) => i.food.medicineNote).filter((n): n is string => Boolean(n))),
  ];
  for (const n of medicineNotes) blocks.push(`If you take medicine: ${n}`);

  if (items.length > 0) {
    const lines = items.map((i) => `${i.food.name}: ${i.food.portionGuidance}`);
    blocks.push(["How much of each to eat:", ...lines].join("\n"));
  }

  if (often) {
    blocks.push(`How often: ${often.text}${often.reason ? ` ${often.reason}` : ""}`);
  }

  blocks.push(CTA);

  return blocks.join("\n\n");
}
