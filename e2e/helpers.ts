import { Page, expect } from "@playwright/test";

export const BASE_URL = "http://localhost:3000";
export const API_URL = "http://localhost:8000";

export const TEST_USER = {
  email: "demo@civicai.vn",
  password: "Demo@2026",
  name: "Nguyễn Văn Demo",
};

export const TEST_DOCS = {
  VB_LOI_01: "b90543ad-5c1e-4ae2-8359-cfbce6c23b57",
  VB_SS_01:  "5991eaf0-d1ed-4224-a144-9bd4f67c1355",
  VB_SS_02:  "c5cc4709-2295-424d-96f9-3eb7d876dcca",
};

export async function login(page: Page) {
  await page.goto("/login");
  await page.fill('input[type="email"]', TEST_USER.email);
  await page.fill('input[type="password"]', TEST_USER.password);
  await page.click('button[type="submit"]');
  await page.waitForURL("**/dashboard**", { timeout: 15_000 });
}

export async function screenshot(page: Page, name: string) {
  await page.screenshot({
    path: `test-results/screenshots/${name}.png`,
    fullPage: false,
  });
}
