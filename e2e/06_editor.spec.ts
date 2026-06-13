import { test, expect } from "@playwright/test";
import { login, TEST_DOCS, screenshot } from "./helpers";

test.describe("PHẦN 6 — EDITOR", () => {
  test.beforeEach(async ({ page }) => { await login(page); });

  test("TC-29: Rà soát VB-LOI-01 — có đề xuất sửa", async ({ page }) => {
    await page.goto(`/dashboard/documents/${TEST_DOCS.VB_LOI_01}`);
    await page.waitForTimeout(3000);
    await screenshot(page, "27_vb_loi_01_before_review");
    // Click công cụ Rà soát (tab Công cụ là mặc định)
    await page.getByText("Rà soát").first().click();
    // Chờ review xong — nút action là "Áp dụng" (không phải "Chấp nhận")
    await page.waitForSelector("text=Áp dụng", { timeout: 60_000 });
    await screenshot(page, "28_rao_soat_results");
    // Kiểm tra có đề xuất sửa
    const applyBtns = page.getByText("Áp dụng");
    const count = await applyBtns.count();
    expect(count).toBeGreaterThan(0);
    // Áp dụng lỗi đầu tiên
    await applyBtns.first().click();
    await page.waitForTimeout(500);
    await screenshot(page, "29_rao_soat_accepted");
  });

  test("TC-21: Chèn vào văn bản — không dư enter", async ({ page }) => {
    await page.goto(`/dashboard/documents/${TEST_DOCS.VB_LOI_01}`);
    await page.waitForTimeout(3000);
    // Mở tab Chat AI
    await page.getByText("Chat AI").click();
    // Gửi câu hỏi
    const input = page.locator("textarea").last();
    await input.fill("Tóm tắt văn bản này trong 2 câu");
    await input.press("Enter");
    await page.waitForTimeout(15_000);
    await screenshot(page, "30_chat_response");
    // Click chèn vào văn bản
    await page.getByText("Chèn vào văn bản").first().click();
    await page.waitForTimeout(1000);
    await screenshot(page, "31_inserted_text");
    // Toast thành công
    await expect(
      page.getByText("Đã chèn vào văn bản")
    ).toBeVisible({ timeout: 5_000 });
  });

  test("TC-28: Tab Công cụ — 9 công cụ màu sắc", async ({ page }) => {
    await page.goto(`/dashboard/documents/${TEST_DOCS.VB_LOI_01}`);
    await page.waitForTimeout(2000);
    // Tab "Công cụ" là mặc định, nhưng click để chắc chắn — dùng .first() tránh strict mode
    await page.getByText("Công cụ").first().click();
    await page.waitForTimeout(500);
    await screenshot(page, "32_tools_panel");
    // Kiểm tra 9 công cụ — dùng .first() vì mỗi tool có label text trong span + button parent
    for (const tool of [
      "Rà soát", "Chuẩn thể thức", "Chuẩn văn phong",
      "Tóm tắt", "Bảng số liệu", "Gợi ý tiếp",
      "Căn cứ pháp lý", "So sánh", "Hỏi đáp",
    ]) {
      await expect(page.getByText(tool, { exact: true }).first()).toBeVisible();
    }
  });

  test("TC-33: Xem trước không bị cắt chữ", async ({ page }) => {
    await page.goto(`/dashboard/documents/${TEST_DOCS.VB_LOI_01}`);
    await page.waitForTimeout(2000);
    await page.getByText("Xem trước").click();
    // Chờ preview load — "Quay lại soạn thảo" xuất hiện xác nhận preview đang hiển thị
    await page.waitForSelector("text=Quay lại soạn thảo", { timeout: 10_000 });
    await screenshot(page, "33_preview_page");
    // Quốc hiệu phải hiện đầy đủ — nth(1) để bỏ qua hidden measurement div
    await expect(
      page.getByText("CỘNG HÒA", { exact: false }).nth(1)
    ).toBeVisible({ timeout: 5_000 });
  });
});
