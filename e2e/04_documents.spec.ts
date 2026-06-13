import { test, expect } from "@playwright/test";
import { login, screenshot } from "./helpers";

test.describe("PHẦN 5 — TÀI LIỆU", () => {
  test.beforeEach(async ({ page }) => { await login(page); });

  test("TC-10: Danh sách văn bản", async ({ page }) => {
    await page.goto("/dashboard/documents");
    await page.waitForTimeout(1500);
    // Chỉ 1 nút Soạn
    const buttons = page.getByText("Soạn văn bản mới");
    await expect(buttons).toHaveCount(1);
    // Ngày có giờ phút
    const dateCell = page.locator("td").filter({
      hasText: /\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}/,
    }).first();
    await expect(dateCell).toBeVisible();
    await screenshot(page, "17_documents_list");
  });

  test("TC-11: Tạo văn bản → WelcomePanel", async ({ page }) => {
    await page.goto("/dashboard/documents");
    await page.getByText("Soạn văn bản mới").click();
    // Modal tự tạo doc và navigate → chờ URL đổi sang /documents/{id}
    await page.waitForURL("**/documents/*", { timeout: 15_000 });
    await page.waitForTimeout(500);
    // WelcomePanel hiện 3 tab
    await expect(
      page.getByText("Chọn template")
    ).toBeVisible({ timeout: 10_000 });
    await screenshot(page, "19_welcome_panel");
  });
});
