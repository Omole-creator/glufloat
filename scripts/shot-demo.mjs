import { chromium } from "playwright";

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 950 } });
await page.goto("http://localhost:3000", { waitUntil: "networkidle" });

// capture the hero demo at 4 moments to see the cycle
for (let i = 0; i < 4; i++) {
  await page.waitForTimeout(1400);
  await page.screenshot({
    path: `qa-shots/demo-${i}.png`,
    clip: { x: 470, y: 430, width: 500, height: 420 },
  });
}

// joy band
await page.getByText("This joy can be yours too.").scrollIntoViewIfNeeded();
await page.waitForTimeout(1200);
await page.screenshot({ path: "qa-shots/joy-band.png" });

// mobile hero
const m = await browser.newPage({ viewport: { width: 375, height: 812 } });
await m.goto("http://localhost:3000", { waitUntil: "networkidle" });
await m.waitForTimeout(2600);
await m.screenshot({ path: "qa-shots/demo-mobile.png" });

await browser.close();
console.log("done");
