// Screenshots of the blue card and the "Check a meal" answer, phone and
// desktop, for eyeballing a redesign. Needs the dev server and QA_EMAIL /
// QA_PASSWORD in .env.local. Writes into qa-shots/ (gitignored).
import { chromium } from "playwright";
import { readFileSync, mkdirSync } from "node:fs";

for (const l of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
  const m = l.match(/^([A-Z_]+)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^"|"$/g, "");
}
const BASE = process.env.QA_BASE ?? "http://localhost:3000";
const OUT = "qa-shots";
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
for (const [tag, viewport] of [["phone", { width: 390, height: 844 }], ["desk", { width: 1280, height: 900 }]]) {
  const page = await browser.newPage({ viewport, deviceScaleFactor: 2 });
  await page.goto(`${BASE}/signin`, { waitUntil: "networkidle" });
  await page.getByLabel("Your email").fill(process.env.QA_EMAIL);
  await page.getByLabel("Your password").fill(process.env.QA_PASSWORD);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await page.waitForURL(/\/app/, { timeout: 30000 });
  const ok = page.getByRole("button", { name: "I understand" });
  if (await ok.waitFor({ timeout: 30000 }).then(() => true).catch(() => false)) await ok.click();
  await page.waitForTimeout(1000);
  const dismiss = page.getByRole("button", { name: "Dismiss" });
  if (await dismiss.isVisible({ timeout: 3000 }).catch(() => false)) await dismiss.click();
  const details = page.getByRole("button", { name: "View details" });
  await details.waitFor({ timeout: 30000 });
  await page.waitForTimeout(1500);
  await page.locator("#todays-meal").screenshot({ path: `${OUT}/card-${tag}.png` }).catch(async () => {
    await page.screenshot({ path: `${OUT}/card-${tag}.png`, fullPage: false });
  });
  const swapBtn = page.getByRole("button", { name: /^I don't have / }).first();
  if (await swapBtn.isVisible().catch(() => false)) {
    await swapBtn.click();
    await page.waitForTimeout(800);
    await page.locator("#todays-meal").screenshot({ path: `${OUT}/card-swapped-${tag}.png` }).catch(() => {});
  }
  await details.click();
  await page.waitForTimeout(2500);
  await page.locator("#dashboard-panel").screenshot({ path: `${OUT}/answer-${tag}.png` }).catch(async () => {
    await page.screenshot({ path: `${OUT}/answer-${tag}.png`, fullPage: true });
  });
  await page.close();
}
await browser.close();
console.log("done");
