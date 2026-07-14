// Eyeballs the four dietician changes in the real app. Throwaway helper.
//   node scripts/shot-dietician.mjs
import { chromium } from "playwright";
import { readFileSync } from "node:fs";

for (const line of readFileSync(".env.local", "utf8").split("\n")) {
  const m = line.match(/^([A-Z_]+)=(.*)$/);
  if (m) process.env[m[1]] = m[2].trim();
}

const BASE = "http://localhost:3000";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 900, height: 1000 } });

await page.goto(`${BASE}/signin`, { waitUntil: "networkidle" });
await page.getByLabel("Your email").fill(process.env.QA_EMAIL);
await page.getByLabel("Your password").fill(process.env.QA_PASSWORD);
await page.getByRole("button", { name: /sign in/i }).click();
await page.waitForURL("**/app", { timeout: 15000 });
// /app renders null until getAccess() resolves, so an instant isVisible() reads
// an empty page. Wait for the modal, then dismiss it.
const dismiss = page.getByRole("button", { name: "I understand" });
await dismiss.waitFor({ state: "visible", timeout: 15000 }).catch(() => {});
if (await dismiss.count()) await dismiss.click();
await page.waitForTimeout(500);

async function card(query, clickText, shot) {
  await page.getByLabel("Search a food").fill(query);
  await page.getByText(clickText, { exact: false }).first().click();
  await page.waitForTimeout(600);
  await page.screenshot({ path: `qa-shots/${shot}.png`, fullPage: true });
  const body = await page.textContent("body");
  return body;
}

const okra = await card("okra soup", "Okra Soup", "diet-okra");
console.log("OKRA");
console.log("  has calm medicine box:", okra.includes("If you take medicine"));
console.log("  metformin line:", okra.includes("take your tablet about 2 hours"));
console.log("  still shows red 'Please note':", okra.includes("Please note"));

const salt = await card("salt", "Salt", "diet-salt");
console.log("SALT");
console.log("  says every day:", /can eat this every day/i.test(salt));
console.log("  says 2 times a week (BUG if true):", /About 2 times a week/i.test(salt));
console.log("  has 5g teaspoon:", salt.includes("one level teaspoon (5g)"));

const seas = await card("maggi", "Seasoning Cube", "diet-seasoning");
console.log("SEASONING");
console.log("  herbs line:", seas.includes("Onions, turmeric, garlic"));

const ogb = await card("ogbono", "Ogbono Soup", "diet-ogbono");
console.log("OGBONO");
console.log("  names the seed fat:", ogb.includes("Ogbono seed is high in fat"));

await browser.close();
console.log("done");
