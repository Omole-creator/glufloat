import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const BASE = process.env.QA_BASE ?? "http://localhost:3000";
const OUT = "qa-shots";
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
const results = [];
const ok = (name, cond) => {
  results.push(`${cond ? "PASS" : "FAIL"}  ${name}`);
};

for (const [label, width, height] of [
  ["desktop", 1440, 900],
  ["mobile", 375, 812],
]) {
  const page = await browser.newPage({ viewport: { width, height } });
  await page.goto(BASE, { waitUntil: "networkidle" });
  await page.screenshot({ path: `${OUT}/landing-${label}-top.png` });
  // scroll through to trigger reveals, then full page shot
  await page.evaluate(async () => {
    const h = document.documentElement.scrollHeight;
    for (let y = 0; y <= h; y += 400) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 120));
    }
    window.scrollTo(0, 0);
  });
  await page.waitForTimeout(1400);
  await page.screenshot({ path: `${OUT}/landing-${label}-full.png`, fullPage: true });
  await page.close();
}

// ---- functional flows (desktop) ----
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

// 1. app page: disclaimer gate appears
await page.goto(`${BASE}/app`, { waitUntil: "networkidle" });
ok("disclaimer gate visible on first open", await page.getByText("It does not cure diabetes.", { exact: false }).isVisible());
await page.screenshot({ path: `${OUT}/app-disclaimer.png` });
await page.getByRole("button", { name: "I understand" }).click();

// 2. search eba -> yellow verdict
await page.getByLabel("Search a food").fill("eba");
await page.getByText("Garri / Eba (cassava swallow)").click();
await page.waitForTimeout(400);
ok("eba verdict yellow", await page.getByText("Yellow. Eat with care.").isVisible());
await page.screenshot({ path: `${OUT}/app-search-eba.png` });

// 3. two more searches -> gate on 4th
for (const q of ["dodo", "coke"]) {
  await page.getByLabel("Search a food").fill(q);
  await page.locator("ul button").first().click();
  await page.waitForTimeout(300);
}
await page.getByLabel("Search a food").fill("suya");
await page.locator("ul button").first().click();
await page.waitForTimeout(400);
ok("paywall after 3 free checks", await page.getByText("You have used your 3 free checks.").isVisible());
await page.screenshot({ path: `${OUT}/app-paywall.png` });

// 4. meal builder locked
await page.getByRole("button", { name: "Build a meal" }).click();
await page.waitForTimeout(300);
ok("meal builder gated", await page.getByText("The Meal Builder is a member feature.").isVisible());

// 4b. trial flow: start trial -> meal builder unlocked, badge shows
await page.goto(`${BASE}/trial`, { waitUntil: "networkidle" });
await page.getByRole("button", { name: "Start my free week now" }).click();
await page.waitForURL("**/app");
await page.waitForTimeout(500);
ok("trial badge shows days left", await page.getByText("Free trial: 7 days left").isVisible());
await page.getByRole("button", { name: "Build a meal" }).click();
await page.waitForTimeout(300);
ok("meal builder open during trial", await page.getByText("Add everything you are eating", { exact: false }).isVisible());
await page.screenshot({ path: `${OUT}/trial-active.png` });

// 5. unlock flow
await page.goto(`${BASE}/unlock?code=GLU-GREEN-2026`, { waitUntil: "networkidle" });
await page.waitForTimeout(500);
ok("unlock accepts code", await page.getByText("You are in. Welcome to Glufloat.").isVisible());
await page.screenshot({ path: `${OUT}/unlock-ok.png` });

// 6. meal builder now works: white rice + efo riro + fish, half rice -> green
await page.goto(`${BASE}/app`, { waitUntil: "networkidle" });
await page.getByRole("button", { name: "Build a meal" }).click();
const addInput = page.getByLabel("Add a food to your meal");
for (const q of ["white rice", "efo riro", "fish"]) {
  await addInput.fill(q);
  await page.locator("ul button").first().click();
  await page.waitForTimeout(250);
}
await page.screenshot({ path: `${OUT}/meal-before-fix.png` });
const yellowVisible = await page.getByText("Almost there. One small change makes it green.").isVisible();
ok("meal starts yellow (normal rice + veg + fish)", yellowVisible);
await page.getByRole("button", { name: "Small" }).first().click();
await page.waitForTimeout(400);
ok("small size turns meal green", await page.getByText("This food is good. Enjoy it.").isVisible());
ok("green answer word is obvious", await page.getByText("Good to eat", { exact: true }).isVisible());
await page.screenshot({ path: `${OUT}/meal-after-fix.png` });

// 7. hard red: add coke
await addInput.fill("coke");
await page.locator("ul button").first().click();
await page.waitForTimeout(400);
ok("coke locks meal red", await page.getByText("The sweet drink makes this red.").isVisible());
await page.screenshot({ path: `${OUT}/meal-hard-red.png` });

// 8. legal pages render
for (const p of ["disclaimer", "terms", "privacy"]) {
  const res = await page.goto(`${BASE}/${p}`, { waitUntil: "domcontentloaded" });
  ok(`/${p} renders`, res.status() === 200);
}

await browser.close();
console.log(results.join("\n"));
const fails = results.filter((r) => r.startsWith("FAIL")).length;
console.log(`\n${results.length - fails}/${results.length} checks passed`);
process.exit(fails ? 1 : 0);
