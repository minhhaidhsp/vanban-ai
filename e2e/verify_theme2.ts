import { chromium } from "@playwright/test";
import * as path from "path";

const dir = path.join(__dirname, "theme-verify");

(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();

  await page.goto("http://localhost:3000/login");
  await page.fill('input[type="email"]', "demo@civicai.vn");
  await page.fill('input[type="password"]', "Demo@2026");
  await page.click('button[type="submit"]');
  await page.waitForURL("**/dashboard**");

  // Ensure blue theme is set in DB (navigate to settings and select blue)
  await page.goto("http://localhost:3000/dashboard/settings");
  await page.waitForTimeout(2000);

  // If current theme is already blue, just navigate. If teal, click blue.
  const currentActive = await page.locator("button.border-brand-600").first().textContent().catch(() => "");
  console.log("Current active card text:", currentActive?.trim());

  // Click Xanh dương if not already active
  const blueCard = page.locator("button").filter({ hasText: /^Xanh dương$/ }).first();
  await blueCard.click();
  await page.waitForURL("**/dashboard/settings**", { timeout: 10000 });

  // Wait for theme-blue class to appear on <html>
  await page.waitForFunction(
    () => document.documentElement.classList.contains("theme-blue"),
    { timeout: 8000 }
  );
  const cls = await page.evaluate(() => document.documentElement.className);
  const brand600 = await page.evaluate(
    () => getComputedStyle(document.documentElement).getPropertyValue("--brand-600").trim()
  );
  console.log("html.class on settings:", cls);
  console.log("--brand-600 computed value:", brand600, "(expected: #0c447c for blue)");
  await page.screenshot({ path: path.join(dir, "06_blue_settings_confirmed.png") });

  // Dashboard — wait explicitly
  await page.goto("http://localhost:3000/dashboard");
  await page.waitForLoadState("domcontentloaded");
  await page.waitForFunction(
    () => document.documentElement.classList.contains("theme-blue"),
    { timeout: 8000 }
  );
  const dashCls = await page.evaluate(() => document.documentElement.className);
  const dashBrand600 = await page.evaluate(
    () => getComputedStyle(document.documentElement).getPropertyValue("--brand-600").trim()
  );
  console.log("html.class on dashboard:", dashCls);
  console.log("--brand-600 on dashboard:", dashBrand600);
  await page.screenshot({ path: path.join(dir, "07_blue_dashboard_confirmed.png") });

  await browser.close();
  console.log("Done — screenshots in", dir);
})().catch((e) => { console.error(e); process.exit(1); });
