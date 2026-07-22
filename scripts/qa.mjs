// End-to-end QA. Requires the dev server running (npm run dev), then:
//   node scripts/qa.mjs
//
// Access moved from localStorage to Supabase accounts, so the suite signs in as
// a dedicated QA user before it can reach /app. That user needs QA_EMAIL and
// QA_PASSWORD in .env.local, and a `subscriptions` row with status 'active' and
// a far-future current_period_end, so its access never lapses. A trial would
// expire after 3 days and the suite would start failing on its own.
//
// Assertions here match exact user-facing strings. If you change a verdict
// headline, a button label, or the disclaimer wording, update this file too.
import { chromium } from "playwright";
import { mkdirSync, readFileSync } from "node:fs";

const BASE = process.env.QA_BASE ?? "http://localhost:3000";
const OUT = "qa-shots";
mkdirSync(OUT, { recursive: true });

// Read .env.local so the command stays a plain `node scripts/qa.mjs`.
for (const line of readFileSync(".env.local", "utf8").split("\n")) {
  const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
}
const QA_EMAIL = process.env.QA_EMAIL;
const QA_PASSWORD = process.env.QA_PASSWORD;
if (!QA_EMAIL || !QA_PASSWORD) {
  console.error("Missing QA_EMAIL / QA_PASSWORD in .env.local. See the header of this file.");
  process.exit(1);
}

const browser = await chromium.launch();
const results = [];

// A failing locator must record a FAIL, not crash the run and hide every later
// check. Each assertion is isolated.
async function check(name, fn) {
  try {
    results.push(`${(await fn()) ? "PASS" : "FAIL"}  ${name}`);
  } catch (err) {
    results.push(`FAIL  ${name}  (${err.message.split("\n")[0]})`);
  }
}

/**
 * Wait for a locator to become visible, then report whether it did.
 *
 * `isVisible()` asks once and returns immediately, which races every client
 * component on this site: /app renders null until getAccess() resolves the
 * Supabase session, so an instant check sees an empty page. This still fails
 * (by timing out) when the element genuinely never appears.
 */
async function visible(locator, timeout = 8000) {
  await locator.waitFor({ state: "visible", timeout });
  return true;
}

// ---- landing screenshots (desktop + mobile) -------------------------------
for (const [label, width, height] of [
  ["desktop", 1440, 900],
  ["mobile", 375, 812],
]) {
  const page = await browser.newPage({ viewport: { width, height } });
  await page.goto(BASE, { waitUntil: "networkidle" });
  await page.screenshot({ path: `${OUT}/landing-${label}-top.png` });
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

// ---- 1. the gate: a signed-out visitor cannot reach the product -----------
// This replaces the old "3 free checks then paywall" checks. Free checks are
// gone: access is now all-or-nothing at /app, decided by the account.
{
  const anon = await browser.newContext();
  const page = await anon.newPage();

  await page.goto(`${BASE}/app`, { waitUntil: "networkidle" });
  await check("signed-out visitor is sent from /app to /signin", async () =>
    new URL(page.url()).pathname === "/signin",
  );
  await page.screenshot({ path: `${OUT}/anon-signin.png` });

  await page.goto(`${BASE}/trial`, { waitUntil: "networkidle" });
  await check("signed-out visitor is sent from /trial to /signup", async () =>
    new URL(page.url()).pathname === "/signup",
  );
  await anon.close();
}

// ---- 2. sign in as the QA member ------------------------------------------
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto(`${BASE}/signin`, { waitUntil: "networkidle" });
await page.getByLabel("Your email").fill(QA_EMAIL);
await page.getByLabel("Your password").fill(QA_PASSWORD);
await page.getByRole("button", { name: "Sign in", exact: true }).click();
await page.waitForURL("**/app", { timeout: 15000 });
await check("QA member signs in and lands on /app", async () =>
  new URL(page.url()).pathname === "/app",
);

// ---- 3. disclaimer gate ----------------------------------------------------
await check("disclaimer gate visible on first open", async () =>
  visible(page.getByText("It does not cure diabetes.", { exact: false })),
);
await page.screenshot({ path: `${OUT}/app-disclaimer.png` });
await page.getByRole("button", { name: "I understand" }).click();

// The QA account is a subscriber with a far-future period end, so /app shows
// the evergreen membership badge rather than a day count.
await check("membership badge shows for a subscriber", async () =>
  visible(page.getByText("Membership: active", { exact: true })),
);

// ---- 4. search: eba -> yellow ----------------------------------------------
// The /app home now leads with today's meal, and the tools sit behind three
// cards under it, so search has to be opened before it can be typed into.
await check("today's meal leads the page", async () =>
  visible(page.getByRole("button", { name: "View details" })),
);
await page.getByRole("button", { name: "Search any food" }).click();
await page.waitForTimeout(400);
await page.getByLabel("Search a food").fill("eba");
// Names shown to a user go through cleanFoodName, which reads a slash as "or".
// The stored name is still "Garri / Eba (cassava swallow)"; the screen is not.
await page.getByText("Garri or Eba (cassava swallow)").first().click();
await page.waitForTimeout(400);
await check("eba verdict yellow", async () =>
  visible(page.getByText("Yellow. Eat with care.")),
);
await page.screenshot({ path: `${OUT}/app-search-eba.png` });

// ---- 5. meal builder: white rice + efo riro + fish, half rice -> green ------
await page.getByRole("button", { name: "Build a meal" }).click();
await check("meal builder opens for a member", async () =>
  visible(page.getByText("Add everything you are eating", { exact: false })),
);
const addInput = page.getByLabel("Add a food to your meal");
for (const q of ["white rice", "efo riro", "fish"]) {
  await addInput.fill(q);
  await page.locator("ul button").first().click();
  await page.waitForTimeout(250);
}
await page.screenshot({ path: `${OUT}/meal-before-fix.png` });
await check("meal starts yellow (normal rice + veg + fish)", async () =>
  visible(page.getByText("Almost there. One small change makes it green.")),
);
await page.getByRole("button", { name: "Small" }).first().click();
await page.waitForTimeout(400);
await check("small size turns meal green", async () =>
  visible(page.getByText("This food is good. Enjoy it.")),
);
// Scoped to the meal answer: today's meal card at the top of the page also
// carries a "Good to eat" pill, and an unscoped locator matches both.
await check("green answer word is obvious", async () =>
  visible(
    page.locator("main").getByText("Good to eat", { exact: true }).last(),
  ),
);

// The meal builder answers "how often", the way a single food card does. The
// strictest food on the plate sets it: white rice here, at 2 times a week.
await check("meal builder shows a countable how-often", async () =>
  visible(page.getByText("You can eat this meal about 2 times a week.", { exact: true })),
);
// The reason must say what the food holds the meal back FROM, as a number.
await check("meal says why, with a number", async () =>
  visible(page.getByText("Without it, you could eat the rest every day.", { exact: false })),
);
await page.screenshot({ path: `${OUT}/meal-after-fix.png` });

// ---- 6. hard red: any sweet drink locks the meal ---------------------------
await addInput.fill("coke");
await page.locator("ul button").first().click();
await page.waitForTimeout(400);
await check("coke locks meal red", async () =>
  visible(page.getByText("The sweet drink makes this red.")),
);
// The how-often line must never contradict the hard red lock.
await check("coke makes how-often say never", async () =>
  visible(page.getByText("Best not to eat this meal at all.", { exact: true })),
);
await page.screenshot({ path: `${OUT}/meal-hard-red.png` });

// ---- 7. legal pages render -------------------------------------------------
for (const p of ["disclaimer", "terms", "privacy"]) {
  await check(`/${p} renders`, async () => {
    const res = await page.goto(`${BASE}/${p}`, { waitUntil: "domcontentloaded" });
    return res.status() === 200;
  });
}

await browser.close();
console.log(results.join("\n"));
const fails = results.filter((r) => r.startsWith("FAIL")).length;
console.log(`\n${results.length - fails}/${results.length} checks passed`);
process.exit(fails ? 1 : 0);
