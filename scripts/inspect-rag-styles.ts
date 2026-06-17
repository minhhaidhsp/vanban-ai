import { chromium } from "@playwright/test";

const API = "http://localhost:8000";
const BASE = "http://localhost:3001";

async function getToken(): Promise<string> {
  const res = await fetch(`${API}/api/v1/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ username: "demo@civicai.vn", password: "Demo@2026" }),
  });
  const data = await res.json();
  return data.access_token;
}

(async () => {
  const token = await getToken();
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    storageState: {
      cookies: [{ name: "access_token", value: token, domain: "localhost", path: "/",
        httpOnly: false, secure: false, sameSite: "Lax", expires: Date.now()/1000 + 86400 }],
      origins: [],
    },
  });
  const page = await ctx.newPage();

  await page.goto(`${BASE}/dashboard/rag-search`);
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(1000);

  // Fill query and click the submit button (title="Gửi")
  const textarea = page.locator("textarea").first();
  await textarea.fill("Quy định về thủ tục đăng ký khai sinh");
  await page.locator('button[title="Gửi"]').click();
  console.log("Query submitted, waiting for response...");

  // Wait for answer bubble (bg-card div) — up to 45s for RAG to respond
  await page.waitForSelector('.bg-card p, [class*="bg-card"] p', { timeout: 45000 });
  await page.waitForTimeout(1000); // let animation settle

  // Use string-form evaluate to avoid tsx/__name serialization issues
  const result = await page.evaluate(`(function() {
    var allP = Array.from(document.querySelectorAll('p'));
    var answerP = null;
    for (var pi = 0; pi < allP.length; pi++) {
      var p = allP[pi];
      var el = p;
      while (el) {
        if (el.className && typeof el.className === 'string' && el.className.includes('bg-card')) {
          answerP = p; break;
        }
        el = el.parentElement;
      }
      if (answerP) break;
    }
    if (!answerP) {
      return {
        error: 'no p inside bg-card',
        sample: allP.slice(0,8).map(function(p) {
          return { cls: p.className, txt: (p.textContent||'').slice(0,50),
            color: window.getComputedStyle(p).color, fs: window.getComputedStyle(p).fontSize };
        })
      };
    }
    var chain = [];
    var cur = answerP;
    for (var i = 0; i <= 5 && cur; i++) {
      var cs = window.getComputedStyle(cur);
      chain.push({ level: i, tag: cur.tagName.toLowerCase(), className: cur.className,
        computedColor: cs.color, computedFontSize: cs.fontSize,
        preview: cur.outerHTML.slice(0, 180) });
      cur = cur.parentElement;
    }
    return { chain: chain };
  })()`);


  console.log(JSON.stringify(result, null, 2));
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
