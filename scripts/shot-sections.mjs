import { chromium } from "playwright";

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto("http://localhost:3000", { waitUntil: "networkidle" });

const shots = [
  ["#how", "how"],
  ["#demo", "demo"],
  ["#pricing", "pricing"],
];

// trust band has no id; grab by text
for (const [sel, name] of shots) {
  await page.locator(sel).scrollIntoViewIfNeeded();
  await page.waitForTimeout(900);
  await page.screenshot({ path: `qa-shots/sec-${name}.png` });
}

// differentiation + trust: scroll to the comparison heading
await page.getByText("Other apps do not know our food.").scrollIntoViewIfNeeded();
await page.waitForTimeout(900);
await page.screenshot({ path: "qa-shots/sec-diff.png" });

await page.getByText("Simple, fast, and made for you.").scrollIntoViewIfNeeded();
await page.waitForTimeout(900);
await page.screenshot({ path: "qa-shots/sec-trust.png" });

await browser.close();
console.log("done");
