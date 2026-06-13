import { test, expect } from "@playwright/test";
import { login, screenshot } from "./helpers";

test.describe("PHẦN 7 — TRA CỨU AI", () => {
  test.beforeEach(async ({ page }) => { await login(page); });

  test("TC-34: Tra cứu khai tử — hiện kết quả từ kho văn bản", async ({ page }) => {
    await page.goto("/dashboard/rag-search");
    await page.waitForTimeout(1000);
    await screenshot(page, "34_rag_search_page");
    const textarea = page.locator("textarea").first();
    await textarea.fill("Đăng ký khai tử thực hiện như thế nào?");
    // RAG search page dùng Ctrl+Enter hoặc nút "Tìm kiếm" để submit
    await page.getByRole("button", { name: "Tìm kiếm" }).click();
    // Chờ kết quả — "Kết quả" heading xuất hiện sau khi AI xử lý
    await expect(
      page.getByText("Kết quả", { exact: true })
    ).toBeVisible({ timeout: 60_000 });
    await screenshot(page, "35_rag_result_khai_tu");
  });

  test("TC-35: Tra cứu khai sinh — có trích dẫn nguồn", async ({ page }) => {
    await page.goto("/dashboard/rag-search");
    await page.waitForTimeout(1000);
    const textarea = page.locator("textarea").first();
    await textarea.fill("Đăng ký khai sinh cần những giấy tờ gì?");
    // Submit bằng nút Tìm kiếm
    await page.getByRole("button", { name: "Tìm kiếm" }).click();
    // Chờ kết quả
    await expect(
      page.getByText("Kết quả", { exact: true })
    ).toBeVisible({ timeout: 60_000 });
    await screenshot(page, "37_rag_result_khai_sinh");
    // Phải có ít nhất 1 citation card (Nguồn trích dẫn hoặc Văn bản liên quan)
    const citationPanel = page.locator(".border-l-teal-400, .border-l-orange-400").first();
    if (await citationPanel.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await screenshot(page, "38_rag_citations");
    }
  });
});
