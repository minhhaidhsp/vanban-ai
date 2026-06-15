import { chromium } from "@playwright/test";
import * as path from "path";
import * as fs from "fs";

const BASE = "http://localhost:3000";
const DIR  = path.join(process.cwd(), "e2e", "lp-sections");
fs.mkdirSync(DIR, { recursive: true });

(async () => {
  const b = await chromium.launch({ headless: true });
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
  const p = await ctx.newPage();

  await p.goto(`${BASE}/`, { waitUntil: "networkidle", timeout: 20000 });
  await p.waitForTimeout(800);

  // Hero (2 nút CTA)
  await p.screenshot({ path: path.join(DIR, "01_hero.png"), clip: { x: 0, y: 0, width: 1440, height: 680 } });
  console.log("01 hero done");

  // Scroll đến section F+G (cuối trang)
  const pageH = await p.evaluate<number>("document.body.scrollHeight");
  await p.evaluate(`window.scrollTo(0, ${pageH - 1000})`);
  await p.waitForTimeout(300);
  await p.screenshot({ path: path.join(DIR, "02_fg_sections.png") });
  console.log("02 F+G done");

  // Footer
  await p.evaluate(`window.scrollTo(0, document.body.scrollHeight)`);
  await p.waitForTimeout(300);
  await p.screenshot({ path: path.join(DIR, "03_footer.png"), clip: { x: 0, y: 800, width: 1440, height: 100 } });
  console.log("03 footer done");

  await b.close();
  console.log("Done →", DIR);
})().catch(e => { console.error(e.message); process.exit(1); });
