import { test, expect } from "@playwright/test";
import { login, screenshot } from "./helpers";

test.describe("PHẦN 4 — DASHBOARD", () => {
  test.beforeEach(async ({ page }) => { await login(page); });

  test("TC-08: Dashboard hiển thị đúng", async ({ page }) => {
    await page.goto("/dashboard");
    await page.waitForTimeout(2000);
    // Panel kho tri thức
    await expect(page.getByText("272")).toBeVisible();
    await expect(page.getByText("7.525")).toBeVisible();
    await expect(page.getByText("93%")).toBeVisible();
    await screenshot(page, "12_dashboard_overview");
    // Sidebar 3 nhóm — dùng .first() tránh strict mode (nhiều element chứa text)
    await expect(page.getByText("NGHIỆP VỤ").first()).toBeVisible();
    await expect(page.getByText("KHO TRI THỨC").first()).toBeVisible();
    await expect(page.getByText("HỆ THỐNG").first()).toBeVisible();
    await screenshot(page, "13_dashboard_sidebar");
  });

  test("TC-09: Sidebar navigation", async ({ page }) => {
    await page.goto("/dashboard");
    // Dùng getByRole('link') để tránh strict mode với "Tài liệu" / "Nguồn tài liệu"
    await page.getByRole("link", { name: "Tài liệu", exact: true }).click();
    await page.waitForURL("**/documents**");
    await screenshot(page, "14_nav_documents");
    await page.getByRole("link", { name: "Tra cứu AI", exact: true }).click();
    await page.waitForURL("**/rag-search**");
    await screenshot(page, "15_nav_rag_search");
    await page.getByRole("link", { name: "Kho văn bản", exact: true }).click();
    await page.waitForURL("**/reference-docs**");
    await screenshot(page, "16_nav_reference_docs");
  });
});
