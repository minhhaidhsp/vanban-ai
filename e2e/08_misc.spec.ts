import { test, expect } from "@playwright/test";
import { login, screenshot } from "./helpers";

test.describe("PHẦN 8-11 — CÁC TRANG KHÁC", () => {
  test.beforeEach(async ({ page }) => { await login(page); });

  test("TC-36: Kho tri thức", async ({ page }) => {
    await page.goto("/dashboard/reference-docs");
    // Không dùng waitForTimeout cố định — để toBeVisible retry khi isLoading xong
    await expect(page.getByText("Kho tri thức").first()).toBeVisible({ timeout: 15_000 });
    await screenshot(page, "39_reference_docs");
  });

  test("TC-37: OCR — trang OCR load thành công", async ({ page }) => {
    await page.goto("/dashboard/ocr");
    // <h1>OCR Văn bản</h1> luôn hiện kể cả khi chưa có job OCR nào
    await expect(page.getByText("OCR Văn bản", { exact: true }).first()).toBeVisible({ timeout: 15_000 });
    await screenshot(page, "40_ocr_page");
  });

  test("TC-38: Trang Tài khoản", async ({ page }) => {
    await page.goto("/dashboard/profile");
    // exact: true — tránh strict mode với subtitle <p>Quản lý thông tin cá nhân và bảo mật</p>
    await expect(
      page.getByText("Thông tin cá nhân", { exact: true })
    ).toBeVisible({ timeout: 15_000 });
    await screenshot(page, "41_profile_page");
  });

  test("TC-39: Trang Cài đặt", async ({ page }) => {
    await page.goto("/dashboard/settings");
    // exact: true — tránh strict mode với subtitle <p>Cấu hình thông tin đơn vị và mẫu văn bản</p>
    await expect(
      page.getByText("Thông tin đơn vị", { exact: true })
    ).toBeVisible({ timeout: 15_000 });
    await screenshot(page, "42_settings_page");
  });

  test("TC-40: Đăng xuất", async ({ page }) => {
    await page.goto("/dashboard");
    await page.getByText("Đăng xuất").click();
    await page.waitForURL("**/login**", { timeout: 10_000 });
    await screenshot(page, "43_after_logout");
    // Truy cập dashboard → redirect login
    await page.goto("/dashboard");
    await page.waitForURL("**/login**", { timeout: 5_000 });
    await screenshot(page, "44_redirect_to_login");
  });
});
