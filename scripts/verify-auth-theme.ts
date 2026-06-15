import { chromium } from "@playwright/test";
import * as path from "path";
import * as fs from "fs";

const BASE = "http://localhost:3000";
const API  = "http://localhost:8000";
const DIR  = path.join(process.cwd(), "e2e", "auth-theme");
fs.mkdirSync(DIR, { recursive: true });

async function getToken(): Promise<string> {
  const res = await fetch(`${API}/api/v1/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ username: "demo@civicai.vn", password: "Demo@2026" }),
  });
  const d = await res.json();
  return d.access_token;
}

async function setTheme(token: string, theme: string) {
  await fetch(`${API}/api/v1/organizations/current`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ theme }),
  });
}

async function snap(label: string, url: string) {
  const b = await chromium.launch({ headless: true });
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
  const p = await ctx.newPage();
  await p.goto(url, { waitUntil: "networkidle", timeout: 20000 });
  await p.waitForTimeout(600);
  const wrapCls = await p.evaluate<string>(`document.querySelector('div[class]')?.className ?? ''`);
  console.log(`  ${label} wrapper class: "${wrapCls}"`);
  await p.screenshot({ path: path.join(DIR, label) });
  await b.close();
}

(async () => {
  const token = await getToken();

  // Theme = blue
  await setTheme(token, "blue");
  await new Promise(r => setTimeout(r, 400));
  console.log("== blue ==");
  await snap("01_login_blue.png", `${BASE}/login`);
  await snap("02_register_blue.png", `${BASE}/register`);

  // Theme = teal
  await setTheme(token, "teal");
  await new Promise(r => setTimeout(r, 400));
  console.log("== teal ==");
  await snap("03_login_teal.png", `${BASE}/login`);

  // Restore blue
  await setTheme(token, "blue");
  console.log("Done →", DIR);
})().catch(e => { console.error(e.message); process.exit(1); });
