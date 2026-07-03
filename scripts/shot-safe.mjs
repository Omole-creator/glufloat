import { chromium } from "playwright";
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 720, height: 900 } });
await p.goto("http://localhost:3000/trial", { waitUntil: "networkidle" });
await p.getByRole("button", { name: "Start my free week now" }).click();
await p.waitForURL("**/app");
await p.getByRole("button", { name: "I understand" }).click();
await p.getByRole("button", { name: "Build a meal" }).click();
const add = p.getByLabel("Add a food to your meal");
for (const q of ["eba", "egusi", "fish"]) {
  await add.fill(q);
  await p.locator("ul button").first().click();
  await p.waitForTimeout(250);
}
await p.getByText("How much of each to eat").scrollIntoViewIfNeeded();
await p.waitForTimeout(400);
await p.screenshot({ path: "qa-shots/portion-safe.png" });
await b.close();
console.log("done");
