import { test, expect } from "@playwright/test";
import { screenshot } from "./helpers";

test.describe("PHẦN 1 — LANDING PAGE", () => {

  test("TC-01: Hiển thị landing page đúng", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("h1")).toContainText("Nâng cao năng suất");
    // Dải số liệu
    await expect(page.getByText("272")).toBeVisible();
    await expect(page.getByText("7.525")).toBeVisible();
    await expect(page.getByText("93%")).toBeVisible();
    await screenshot(page, "01_landing_hero");
    // Section tác tử
    await expect(page.getByText("Cốt lõi").first()).toBeVisible();
    await screenshot(page, "02_landing_agents");
    // Section bảo mật
    await expect(page.getByText("Self-hosted")).toBeVisible();
    await screenshot(page, "03_landing_security");
  });

  test("TC-02: Nút Xem tính năng scroll đúng", async ({ page }) => {
    await page.goto("/");
    await page.getByText("Xem tính năng").click();
    await page.waitForTimeout(800);
    const features = page.locator("#features");
    await expect(features).toBeInViewport();
    await screenshot(page, "04_landing_scroll_features");
  });

  test("TC-03: ChatWidget hoạt động", async ({ page }) => {
    await page.goto("/");
    // Mở chat widget
    await page.locator("button").filter({
      has: page.locator("svg"),
    }).last().click();
    await page.waitForTimeout(500);
    await screenshot(page, "05_chat_widget_open");
    // Nhập câu hỏi
    const input = page.locator("textarea, input[type=text]").last();
    await input.fill("Đăng ký khai sinh cần những giấy tờ gì?");
    await input.press("Enter");
    // Chờ response
    await page.waitForTimeout(15_000);
    await screenshot(page, "06_chat_widget_response");
    // Kiểm tra có nút tải mẫu đơn — button text là "Tải {formName}" không phải "Tải mẫu"
    await expect(
      page.locator("button").filter({ hasText: /^Tải / }).first()
    ).toBeVisible({ timeout: 20_000 });
    await screenshot(page, "07_chat_widget_download_btn");
  });
});
