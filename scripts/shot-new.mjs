import { chromium } from "playwright";

const browser = await chromium.launch();

// desktop hero
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto("http://localhost:3000", { waitUntil: "networkidle" });
await page.waitForTimeout(1400);
await page.screenshot({ path: "qa-shots/new-hero.png" });

await page.getByText("People eating their food again", { exact: false }).scrollIntoViewIfNeeded();
await page.waitForTimeout(1200);
await page.screenshot({ path: "qa-shots/new-testimonials.png" });

await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
await page.waitForTimeout(1200);
await page.screenshot({ path: "qa-shots/new-footer.png", fullPage: false });

// mobile hero
const m = await browser.newPage({ viewport: { width: 375, height: 812 } });
await m.goto("http://localhost:3000", { waitUntil: "networkidle" });
await m.waitForTimeout(1400);
await m.screenshot({ path: "qa-shots/new-hero-mobile.png" });

await browser.close();
console.log("done");
