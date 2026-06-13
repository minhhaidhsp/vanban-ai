import { test, expect } from "@playwright/test";
import { login, screenshot } from "./helpers";

// Điều hướng tới trang soạn văn bản mới và chờ WelcomePanel hiện
async function goToNewDoc(page: any) {
  await login(page);
  await page.goto("/dashboard/documents");
  await page.getByText("Soạn văn bản mới").click();
  // Modal tự tạo doc rồi navigate → đợi URL đổi sang /documents/{id}
  await page.waitForURL("**/documents/*", { timeout: 15_000 });
  await page.waitForTimeout(500);
}

test.describe("PHẦN 5 — WELCOME PANEL", () => {

  test("TC-12: Chọn template → editor có cấu trúc", async ({ page }) => {
    await goToNewDoc(page);
    // Tab "Chọn template" là mặc định, click để đảm bảo
    await page.getByText("Chọn template").click();
    await page.waitForTimeout(500);
    await screenshot(page, "20_welcome_template_tab");
    // Click "Công văn" trong template grid
    await page.getByText("Công văn").first().click();
    await page.waitForTimeout(2000);
    await screenshot(page, "21_editor_template_loaded");
    // Tiêu đề được đặt thành "{loaiLabel} không tiêu đề"
    await expect(
      page.getByText("không tiêu đề", { exact: false })
    ).toBeVisible({ timeout: 10_000 });
  });

  test("TC-13: Tạo bằng AI", async ({ page }) => {
    await goToNewDoc(page);
    await page.getByText("Tạo bằng AI").click();
    await page.waitForTimeout(300);
    await screenshot(page, "22_welcome_ai_tab");
    const textarea = page.locator("textarea").first();
    await textarea.fill(
      "Soạn công văn của UBND phường gửi các tổ dân phố " +
      "về vệ sinh môi trường, tổng vệ sinh trước Tết Nguyên đán, " +
      "báo cáo kết quả trước ngày 25/01."
    );
    await screenshot(page, "23_welcome_ai_filled");
    // exact: true để tránh strict mode với <p>Chọn cách tạo văn bản phù hợp</p>
    await page.getByText("Tạo văn bản", { exact: true }).click();
    // Chờ AI tạo xong tối đa 90s
    await page.waitForSelector("text=AI đã tạo mẫu", { timeout: 90_000 });
    await screenshot(page, "24_editor_ai_generated");
  });

  test("TC-14: Trang trắng", async ({ page }) => {
    await goToNewDoc(page);
    await page.getByText("Trang trắng").click();
    await page.waitForTimeout(300);
    await screenshot(page, "25_welcome_blank_tab");
    await page.getByText("Vào editor").click();
    await page.waitForTimeout(1500);
    await screenshot(page, "26_editor_blank");
    // Thanh menu không có "Độ mật" khi ở blank mode
    await expect(page.getByText("Độ mật")).not.toBeVisible();
  });
});
