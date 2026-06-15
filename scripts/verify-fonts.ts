import { chromium } from "@playwright/test";
import * as path from "path";
import * as fs from "fs";

const BASE = "http://localhost:3001";
const API = "http://localhost:8000";
const DIR = path.join(process.cwd(), "e2e", "font-verify");
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
      cookies: [{ name: "access_token", value: token, domain: "localhost", path: "/", httpOnly: false, secure: false, sameSite: "Lax", expires: Date.now() / 1000 + 86400 }],
      origins: [],
    },
  });
  const page = await ctx.newPage();

  // 1. Landing page
  await page.goto(`${BASE}/`);
  await page.waitForLoadState("networkidle");
  await page.screenshot({ path: path.join(DIR, "01_landing.png"), fullPage: true });
  console.log("01 landing done");

  // 2. Dashboard - wait for content
  await page.goto(`${BASE}/dashboard`);
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(2000);
  await page.screenshot({ path: path.join(DIR, "02_dashboard.png") });
  console.log("02 dashboard done");

  // 3. Tai lieu list - wait for table/list
  await page.goto(`${BASE}/dashboard/documents`);
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(2000);
  await page.screenshot({ path: path.join(DIR, "03_documents.png") });
  console.log("03 documents done");

  // 4. Settings page - wait for form to load
  await page.goto(`${BASE}/dashboard/settings`);
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(2000);
  await page.screenshot({ path: path.join(DIR, "04_settings.png") });
  console.log("04 settings done");

  await browser.close();
  console.log("All screenshots saved to", DIR);
})().catch((e) => { console.error(e); process.exit(1); });
