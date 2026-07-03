import { chromium } from "playwright";
const browser = await chromium.launch();

const page = await browser.newPage({ viewport: { width: 900, height: 1000 } });
// start a trial so the meal builder is open
await page.goto("http://localhost:3000/trial", { waitUntil: "networkidle" });
await page.getByRole("button", { name: "Start my free week now" }).click();
await page.waitForURL("**/app");
await page.getByRole("button", { name: "I understand" }).click();

// verdict card with portion visual
await page.getByLabel("Search a food").fill("eba");
await page.getByText("Garri / Eba (cassava swallow)").click();
await page.waitForTimeout(500);
await page.screenshot({ path: "qa-shots/portion-verdict.png", clip: { x: 150, y: 250, width: 720, height: 430 } });

// meal builder with per-food safe sizes
await page.getByRole("button", { name: "Build a meal" }).click();
const add = page.getByLabel("Add a food to your meal");
for (const q of ["white rice", "efo riro", "fish"]) {
  await add.fill(q);
  await page.locator("ul button").first().click();
  await page.waitForTimeout(250);
}
await page.waitForTimeout(400);
await page.screenshot({ path: "qa-shots/portion-meal.png", fullPage: false });

// mobile hero traffic light
const m = await browser.newPage({ viewport: { width: 375, height: 812 } });
await m.goto("http://localhost:3000", { waitUntil: "networkidle" });
await m.waitForTimeout(1500);
await m.evaluate(() => window.scrollTo(0, 420));
await m.waitForTimeout(600);
await m.screenshot({ path: "qa-shots/portion-mobile-hero.png" });

await browser.close();
console.log("done");
