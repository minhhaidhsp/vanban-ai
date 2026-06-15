/**
 * One-shot theme switcher verification — not a test suite, run via ts-node / npx tsx
 */
import { chromium } from "@playwright/test";
import * as path from "path";
import * as fs from "fs";

const SCREENSHOTS = path.join(__dirname, "theme-verify");
fs.mkdirSync(SCREENSHOTS, { recursive: true });

async function shot(page: import("@playwright/test").Page, name: string) {
  const file = path.join(SCREENSHOTS, `${name}.png`);
  await page.screenshot({ path: file, fullPage: false });
  console.log(`  📸 ${file}`);
  return file;
}

async function getHtmlClasses(page: import("@playwright/test").Page) {
  return page.evaluate(() => document.documentElement.className);
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();

  console.log("\n=== STEP 1: Login ===");
  await page.goto("http://localhost:3000/login");
  await page.fill('input[type="email"]', "demo@civicai.vn");
  await page.fill('input[type="password"]', "Demo@2026");
  await page.click('button[type="submit"]');
  await page.waitForURL("**/dashboard**", { timeout: 15_000 });
  console.log("  ✅ Logged in, URL:", page.url());

  console.log("\n=== STEP 2: Navigate to Settings ===");
  await page.goto("http://localhost:3000/dashboard/settings");
  await page.waitForLoadState("domcontentloaded");
  await page.waitForTimeout(1500); // wait for org query to resolve
  await shot(page, "01_settings_teal_active");

  // Check 3 theme cards present
  const themeCards = await page.locator("button").filter({ hasText: /Xanh ngọc|Xanh dương|Đỏ/ }).all();
  console.log(`  Theme cards found: ${themeCards.length} (expected 3)`);
  for (const card of themeCards) {
    const label = await card.textContent();
    console.log(`    - "${label?.trim()}"`);
  }

  // Check which card has the "active" border style (border-brand-600)
  const htmlCls1 = await getHtmlClasses(page);
  console.log(`  <html> classes after settings load: "${htmlCls1}"`);
  // teal = no extra class

  console.log("\n=== STEP 3: Click 'Xanh dương' ===");
  const blueCard = page.locator("button").filter({ hasText: "Xanh dương" }).first();
  await blueCard.click();
  console.log("  Clicked 'Xanh dương', waiting for reload...");

  // Page will reload — wait for navigation
  await page.waitForURL("**/dashboard/settings**", { timeout: 15_000 });
  await page.waitForLoadState("domcontentloaded");
  await page.waitForTimeout(1500);
  await shot(page, "02_settings_after_blue_select");

  const htmlCls2 = await getHtmlClasses(page);
  console.log(`  <html> classes after blue select: "${htmlCls2}"`);
  const hasBlueClass = htmlCls2.includes("theme-blue");
  console.log(`  .theme-blue on <html>: ${hasBlueClass ? "✅ YES" : "❌ NO"}`);

  // Check org API to confirm DB was updated
  const orgRes = await page.evaluate(async () => {
    const r = await fetch("http://localhost:8000/api/v1/organizations/current", {
      headers: { Authorization: `Bearer ${document.cookie.match(/access_token=([^;]+)/)?.[1] ?? ""}` },
    });
    return r.json();
  });
  console.log(`  DB org.theme = "${orgRes.theme}"`);

  console.log("\n=== STEP 4: Navigate to Dashboard (check blue theme propagates) ===");
  await page.goto("http://localhost:3000/dashboard");
  await page.waitForLoadState("domcontentloaded");
  await page.waitForTimeout(1500);
  await shot(page, "03_dashboard_blue_theme");
  const htmlCls3 = await getHtmlClasses(page);
  console.log(`  <html> on dashboard: "${htmlCls3}" — blue: ${htmlCls3.includes("theme-blue") ? "✅" : "❌"}`);

  console.log("\n=== STEP 5: Reload — theme should persist ===");
  await page.reload();
  await page.waitForLoadState("domcontentloaded");
  await page.waitForTimeout(1500);
  await shot(page, "04_dashboard_after_reload");
  const htmlCls4 = await getHtmlClasses(page);
  console.log(`  <html> after reload: "${htmlCls4}" — blue persists: ${htmlCls4.includes("theme-blue") ? "✅" : "❌"}`);

  console.log("\n=== STEP 6: Switch back to Teal ===");
  await page.goto("http://localhost:3000/dashboard/settings");
  await page.waitForLoadState("domcontentloaded");
  await page.waitForTimeout(1500);
  const tealCard = page.locator("button").filter({ hasText: "Xanh ngọc" }).first();
  await tealCard.click();
  console.log("  Clicked 'Xanh ngọc', waiting for reload...");
  await page.waitForURL("**/dashboard/settings**", { timeout: 15_000 });
  await page.waitForLoadState("domcontentloaded");
  await page.waitForTimeout(1500);
  await shot(page, "05_settings_back_to_teal");
  const htmlCls5 = await getHtmlClasses(page);
  console.log(`  <html> after teal: "${htmlCls5}" — no blue class: ${!htmlCls5.includes("theme-blue") ? "✅" : "❌"}`);

  // Verify DB
  const orgRes2 = await page.evaluate(async () => {
    const r = await fetch("http://localhost:8000/api/v1/organizations/current", {
      headers: { Authorization: `Bearer ${document.cookie.match(/access_token=([^;]+)/)?.[1] ?? ""}` },
    });
    return r.json();
  });
  console.log(`  DB org.theme = "${orgRes2.theme}"`);

  await browser.close();
  console.log("\n=== DONE ===");
  console.log(`Screenshots in: ${SCREENSHOTS}`);
})().catch((e) => { console.error(e); process.exit(1); });
