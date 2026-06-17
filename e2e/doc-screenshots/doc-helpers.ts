import { Page } from "@playwright/test";
import { TEST_USER, BASE_URL } from "../helpers";
import * as fs from "fs";
import * as path from "path";

export { TEST_USER, BASE_URL };

export const TEST_ADMIN = {
  email:    "minhhaidhsp@gmail.com",
  password: "12345678",
  name:     "Admin",
};

export async function loginAs(
  page: Page,
  user: { email: string; password: string }
) {
  await page.goto("/login");
  await page.fill('input[type="email"]', user.email);
  await page.fill('input[type="password"]', user.password);
  await page.click('button[type="submit"]');
  await page.waitForURL("**/dashboard**", { timeout: 15_000 });
}

const OUTPUT_DIR = path.join(__dirname, "output");
const MANIFEST_PATH = path.join(OUTPUT_DIR, "manifest.json");

interface CaptureOptions {
  module: string;
  file: string;
  title: string;
  description: string;
  highlightSelector?: string;
  clipSelector?: string;  // nếu set, chỉ chụp vùng quanh element này
  clipPadding?: number;   // padding (px) quanh clipSelector, default 24
}

export async function captureStep(page: Page, opts: CaptureOptions) {
  const moduleDir = path.join(OUTPUT_DIR, opts.module);
  fs.mkdirSync(moduleDir, { recursive: true });

  let highlighted = false;
  if (opts.highlightSelector) {
    highlighted = await page.evaluate((sel) => {
      const el = document.querySelector(sel);
      if (!el) return false;
      (el as HTMLElement).style.outline = "3px solid #ef4444";
      (el as HTMLElement).style.outlineOffset = "2px";
      (el as HTMLElement).style.boxShadow = "0 0 0 6px rgba(239,68,68,0.25)";
      (el as HTMLElement).setAttribute("data-doc-highlight", "1");
      return true;
    }, opts.highlightSelector);
  }

  let clip: { x: number; y: number; width: number; height: number } | undefined;
  if (opts.clipSelector) {
    const box = await page.locator(opts.clipSelector).boundingBox();
    if (box) {
      const pad = opts.clipPadding ?? 24;
      clip = {
        x: Math.max(0, box.x - pad),
        y: Math.max(0, box.y - pad),
        width: box.width + pad * 2,
        height: box.height + pad * 2,
      };
    }
  }

  const filePath = path.join(moduleDir, `${opts.file}.png`);
  await page.screenshot({ path: filePath, fullPage: false, ...(clip ? { clip } : {}) });

  if (highlighted) {
    await page.evaluate((sel) => {
      const el = document.querySelector(sel) as HTMLElement | null;
      if (el) {
        el.style.outline = "";
        el.style.outlineOffset = "";
        el.style.boxShadow = "";
        el.removeAttribute("data-doc-highlight");
      }
    }, opts.highlightSelector);
  }

  let manifest: any[] = [];
  if (fs.existsSync(MANIFEST_PATH)) {
    manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, "utf-8"));
  }
  manifest.push({
    module: opts.module,
    file: `${opts.file}.png`,
    title: opts.title,
    description: opts.description,
    highlighted: !!opts.highlightSelector,
    order: manifest.length + 1,
  });
  fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2));

  console.log(`  ✓ Captured: ${opts.module}/${opts.file}.png`);
}

export async function login(page: Page) {
  await page.goto("/login");
  await page.fill('input[type="email"]', TEST_USER.email);
  await page.fill('input[type="password"]', TEST_USER.password);
  await page.click('button[type="submit"]');
  await page.waitForURL("**/dashboard**", { timeout: 15_000 });
}
