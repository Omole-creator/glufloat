// Full-page screenshots of each /app tab on a phone, plus a searched food,
// for eyeballing a redesign. Needs the dev server and QA_EMAIL / QA_PASSWORD
// in .env.local. Writes into qa-shots/ (gitignored).
import { chromium } from "playwright";
import { readFileSync, mkdirSync } from "node:fs";

for (const l of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
  const m = l.match(/^([A-Z_]+)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^"|"$/g, "");
}
const BASE = process.env.QA_BASE ?? "http://localhost:3000";
const OUT = "qa-shots";
const width = Number(process.env.SHOT_W ?? 390);
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width, height: 844 }, deviceScaleFactor: 1 });
await page.goto(`${BASE}/signin`, { waitUntil: "networkidle" });
await page.getByLabel("Your email").fill(process.env.QA_EMAIL);
await page.getByLabel("Your password").fill(process.env.QA_PASSWORD);
await page.getByRole("button", { name: "Sign in", exact: true }).click();
await page.waitForURL(/\/app/, { timeout: 30000 });
const ok = page.getByRole("button", { name: "I understand" });
if (await ok.waitFor({ timeout: 30000 }).then(() => true).catch(() => false)) await ok.click();
await page.waitForTimeout(1500);
const dismiss = page.getByRole("button", { name: "Dismiss" });
if (await dismiss.isVisible().catch(() => false)) await dismiss.click();
await page.getByRole("button", { name: "View details" }).waitFor({ timeout: 30000 });
await page.waitForTimeout(2500);
await page.screenshot({ path: `${OUT}/tab-today-${width}.png`, fullPage: true });

const tabs = (process.env.SHOT_TABS ?? "My details,Search,Report").split(",");
for (const t of tabs) {
  const btn = page.locator("nav button:visible, nav a:visible").filter({ hasText: new RegExp(`^${t}`) }).first();
  if (!(await btn.count())) continue;
  await btn.click();
  await page.waitForTimeout(2000);
  if (t === "Search") {
    const box = page.getByPlaceholder(/eba|food/i).locator("visible=true").first();
    await box.fill(process.env.SHOT_FOOD ?? "eba");
    await page.waitForTimeout(800);
    await page.locator("ul button:visible").first().click().catch(() => {});
    await page.waitForTimeout(2000);
  }
  await page.screenshot({ path: `${OUT}/tab-${t.replace(/\s+/g, "-").toLowerCase()}-${width}.png`, fullPage: true });
}
await browser.close();
console.log("done");
