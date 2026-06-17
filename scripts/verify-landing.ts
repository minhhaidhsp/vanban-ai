import { chromium } from "@playwright/test";
import * as path from "path";
import * as fs from "fs";

const BASE = "http://localhost:3002";
const DIR = path.join(process.cwd(), "e2e", "landing-verify");
fs.mkdirSync(DIR, { recursive: true });

(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();

  await page.goto(`${BASE}/`);
  await page.waitForLoadState("networkidle");

  // Full page
  await page.screenshot({ path: path.join(DIR, "01_landing_full.png"), fullPage: true });
  console.log("01 full done");

  // Hero section
  await page.screenshot({ path: path.join(DIR, "02_hero.png"), clip: { x: 0, y: 0, width: 1440, height: 600 } });
  console.log("02 hero done");

  // Thực trạng / Với CivicAI section (scroll down first)
  await page.evaluate(() => window.scrollTo(0, 800));
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(DIR, "03_problems_solutions.png") });
  console.log("03 problems done");

  // Scroll to Luu tru section
  await page.evaluate(() => window.scrollTo(0, 2600));
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(DIR, "04_luu_tru.png") });
  console.log("04 luu_tru done");

  await browser.close();
  console.log("Done →", DIR);
})().catch((e) => { console.error(e); process.exit(1); });
