import { chromium } from "@playwright/test";
import * as path from "path";
import * as fs from "fs";

const BASE = "http://localhost:3000";
const API  = "http://localhost:8000";
const DIR  = path.join(process.cwd(), "e2e", "rag-color-verify");
fs.mkdirSync(DIR, { recursive: true });

async function getToken(): Promise<string> {
  const res = await fetch(`${API}/api/v1/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ username: "demo@civicai.vn", password: "Demo@2026" }),
  });
  const data = await res.json();
  if (!data.access_token) throw new Error("Login failed: " + JSON.stringify(data));
  return data.access_token;
}

(async () => {
  const token = await getToken();
  console.log("Got token OK");

  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    storageState: {
      cookies: [{
        name: "access_token", value: token, domain: "localhost", path: "/",
        httpOnly: false, secure: false, sameSite: "Lax", expires: Date.now() / 1000 + 86400,
      }],
      origins: [],
    },
  });
  const page = await ctx.newPage();

  await page.goto(`${BASE}/dashboard/rag-search`);
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(1000);

  // Screenshot: history panel visible, no answer yet
  await page.screenshot({ path: path.join(DIR, "01_before_query.png") });
  console.log("01 before_query done");

  // Submit query
  const textarea = page.locator("textarea").first();
  await textarea.fill("Thủ tục đăng ký thường trú là gì?");
  await page.locator('button[title="Gửi"]').click();
  console.log("Query submitted, waiting for answer (up to 60s)...");

  // Wait for answer bubble — the answer div has class "bg-card" and contains <p>
  try {
    await page.waitForFunction(
      `(function() {
        var divs = Array.from(document.querySelectorAll('div'));
        return divs.some(function(d) {
          return d.className && typeof d.className === 'string'
            && d.className.includes('bg-card')
            && d.className.includes('max-w-')
            && d.querySelector('p');
        });
      })()`,
      { timeout: 60000 }
    );
    await page.waitForTimeout(800);
    console.log("Answer loaded!");

    // Full viewport screenshot showing both history + answer side by side
    await page.screenshot({ path: path.join(DIR, "02_with_answer.png") });
    console.log("02 with_answer done");

    // Zoom in: clip left panel (history) + right panel start
    await page.screenshot({
      path: path.join(DIR, "03_history_panel.png"),
      clip: { x: 0, y: 0, width: 240, height: 900 },
    });
    await page.screenshot({
      path: path.join(DIR, "04_answer_text.png"),
      clip: { x: 240, y: 120, width: 900, height: 650 },
    });
    console.log("03+04 clips done");

    // Extract computed colors for comparison
    const colors = await page.evaluate(`(function() {
      // History item title
      var historyItem = document.querySelector('[class*="px-3"][class*="py-2"][class*="rounded-md"][class*="cursor-pointer"] span');
      // History header
      var historyHeader = document.querySelector('[class*="font-medium"][class*="truncate"]');
      // Answer p
      var answerP = null;
      var divs = Array.from(document.querySelectorAll('div'));
      for (var i = 0; i < divs.length; i++) {
        var d = divs[i];
        if (d.className && typeof d.className === 'string'
          && d.className.includes('bg-card') && d.className.includes('max-w-')) {
          var p = d.querySelector('p');
          if (p) { answerP = p; break; }
        }
      }
      return {
        historyHeader: historyHeader ? {
          text: (historyHeader.textContent||'').trim().slice(0,30),
          color: window.getComputedStyle(historyHeader).color,
          fontSize: window.getComputedStyle(historyHeader).fontSize,
        } : null,
        historyItem: historyItem ? {
          text: (historyItem.textContent||'').trim().slice(0,40),
          color: window.getComputedStyle(historyItem).color,
          fontSize: window.getComputedStyle(historyItem).fontSize,
        } : null,
        answerP: answerP ? {
          text: (answerP.textContent||'').slice(0,60),
          color: window.getComputedStyle(answerP).color,
          fontSize: window.getComputedStyle(answerP).fontSize,
        } : null,
      };
    })()`);
    console.log("Computed colors:", JSON.stringify(colors, null, 2));

  } catch (e) {
    console.log("Answer did not load in 60s — taking current screenshot anyway");
    await page.screenshot({ path: path.join(DIR, "02_timeout.png") });
  }

  await browser.close();
  console.log("Done →", DIR);
})().catch((e) => { console.error(e); process.exit(1); });
