import { chromium } from "playwright";

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto("http://localhost:3000", { waitUntil: "networkidle" });
await page.waitForTimeout(1500);
await page.screenshot({ path: "qa-shots/rev-hero-1.png", clip: { x: 0, y: 90, width: 1440, height: 320 } });
await page.waitForTimeout(2000);
await page.screenshot({ path: "qa-shots/rev-hero-2.png", clip: { x: 0, y: 90, width: 1440, height: 320 } });

const m = await browser.newPage({ viewport: { width: 375, height: 812 } });
await m.goto("http://localhost:3000", { waitUntil: "networkidle" });
await m.waitForTimeout(1500);
await m.screenshot({ path: "qa-shots/rev-hero-mobile.png" });

const a = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await a.goto("http://localhost:3000/about", { waitUntil: "networkidle" });
await a.waitForTimeout(1600);
await a.screenshot({ path: "qa-shots/rev-about.png", fullPage: true });

await browser.close();
console.log("done");
