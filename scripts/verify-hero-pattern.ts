import { chromium } from "@playwright/test";
import * as path from "path";
import * as fs from "fs";

const BASE = "http://localhost:3003";
const API  = "http://localhost:8000";
const DIR  = path.join(process.cwd(), "e2e", "hero-pattern");
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

async function snap(label: string, clipY = 0, clipH = 700) {
  const b = await chromium.launch({ headless: true });
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
  const p = await ctx.newPage();
  await p.goto(`${BASE}/`, { waitUntil: "networkidle", timeout: 20000 });
  await p.waitForTimeout(1000); // let animations settle
  await p.screenshot({ path: path.join(DIR, label), clip: { x: 0, y: clipY, width: 1440, height: clipH } });
  await b.close();
}

(async () => {
  const token = await getToken();

  // Theme blue
  await setTheme(token, "blue");
  await new Promise(r => setTimeout(r, 500));
  console.log("== blue: hero ==");
  await snap("01_hero_blue.png", 0, 700);

  // Theme teal
  await setTheme(token, "teal");
  await new Promise(r => setTimeout(r, 500));
  console.log("== teal: hero ==");
  await snap("02_hero_teal.png", 0, 700);

  // Full page teal (sections F+G+footer) — scroll to bottom first
  console.log("== teal: F+G+footer ==");
  const b2 = await chromium.launch({ headless: true });
  const ctx2 = await b2.newContext({ viewport: { width: 1440, height: 900 } });
  const p2 = await ctx2.newPage();
  await p2.goto(`${BASE}/`, { waitUntil: "networkidle", timeout: 20000 });
  await p2.waitForTimeout(800);
  await p2.evaluate("window.scrollTo(0, document.body.scrollHeight - 1100)");
  await p2.waitForTimeout(300);
  await p2.screenshot({ path: path.join(DIR, "03_fg_footer_teal.png") });
  await b2.close();

  // Restore blue
  await setTheme(token, "blue");
  console.log("Done →", DIR);
})().catch(e => { console.error(e.message); process.exit(1); });
