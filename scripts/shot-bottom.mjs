import { chromium } from "playwright";

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto("http://localhost:3000", { waitUntil: "networkidle" });

await page.locator("#faq").scrollIntoViewIfNeeded();
await page.waitForTimeout(1200);
await page.screenshot({ path: "qa-shots/section-faq.png" });

await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
await page.waitForTimeout(1200);
await page.screenshot({ path: "qa-shots/section-close.png" });

await browser.close();
console.log("done");
