import { chromium } from "@playwright/test";
import * as path from "path";
import * as fs from "fs";

const BASE = "http://localhost:3000";
const API  = "http://localhost:8000";
const DIR  = path.join(process.cwd(), "e2e", "lp-theme");
fs.mkdirSync(DIR, { recursive: true });

async function getToken(): Promise<string> {
  const res = await fetch(`${API}/api/v1/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ username: "demo@civicai.vn", password: "Demo@2026" }),
  });
  const data = await res.json();
  return data.access_token;
}

async function setTheme(token: string, theme: string) {
  await fetch(`${API}/api/v1/organizations/current`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ theme }),
  });
}

async function screenshot(name: string) {
  const b = await chromium.launch({ headless: true });
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
  const p = await ctx.newPage();
  await p.goto(`${BASE}/`, { waitUntil: "networkidle", timeout: 20000 });
  await p.waitForTimeout(800);
  const cls = await p.evaluate<string>(`document.querySelector('main')?.className ?? ''`);
  console.log(`  main.className = "${cls}"`);
  await p.screenshot({ path: path.join(DIR, name), clip: { x: 0, y: 0, width: 1440, height: 700 } });
  await b.close();
}

(async () => {
  const token = await getToken();

  // 1. Current state (blue)
  console.log("== Screenshot 1: theme=blue ==");
  await screenshot("01_blue.png");

  // 2. Switch to teal
  await setTheme(token, "teal");
  await new Promise(r => setTimeout(r, 500));
  console.log("== Screenshot 2: theme=teal ==");
  await screenshot("02_teal.png");

  // 3. Switch back to blue
  await setTheme(token, "blue");
  await new Promise(r => setTimeout(r, 500));
  console.log("== Screenshot 3: back to blue ==");
  await screenshot("03_blue_again.png");

  console.log("Done →", DIR);
})().catch((e) => { console.error(e.message); process.exit(1); });
