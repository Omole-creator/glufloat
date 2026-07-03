import { chromium } from "playwright";

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

// unlock -> paid
await page.goto("http://localhost:3000/unlock?code=GLU-GREEN-2026", {
  waitUntil: "networkidle",
});
await page.waitForTimeout(1600);
await page.goto("http://localhost:3000/", { waitUntil: "networkidle" });
await page.waitForTimeout(800);
const hasOpenApp = await page.getByRole("link", { name: "Open app" }).isVisible();
const hasTrial = await page.getByRole("link", { name: "Start free trial" }).count();
console.log("paid nav shows 'Open app':", hasOpenApp);
console.log("paid nav 'Start free trial' count:", hasTrial);
await page.screenshot({ path: "qa-shots/paid-nav.png", clip: { x: 0, y: 0, width: 1440, height: 80 } });

await browser.close();
