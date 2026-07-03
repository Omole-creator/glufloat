import { chromium } from "playwright";

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto("http://localhost:3000", { waitUntil: "networkidle" });

const count = async () =>
  page.evaluate(() => ({
    total: document.querySelectorAll(".reveal").length,
    visible: document.querySelectorAll(".reveal.is-visible").length,
    scrollHeight: document.body.scrollHeight,
    docScrollHeight: document.documentElement.scrollHeight,
    scrollY: window.scrollY,
  }));

console.log("initial:", await count());

// slow scroll to bottom
await page.evaluate(async () => {
  const h = document.documentElement.scrollHeight;
  for (let y = 0; y <= h; y += 400) {
    window.scrollTo(0, y);
    await new Promise((r) => setTimeout(r, 120));
  }
});
await page.waitForTimeout(1200);
console.log("after slow scroll:", await count());

await page.screenshot({ path: "qa-shots/debug-bottom.png" });
await browser.close();
