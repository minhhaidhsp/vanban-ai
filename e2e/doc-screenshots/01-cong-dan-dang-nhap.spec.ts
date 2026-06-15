import { test } from "@playwright/test";
import { captureStep, login, TEST_USER } from "./doc-helpers";

test.describe("Doc screenshots: Cổng công dân & Đăng nhập", () => {
  test("Cổng công dân + Đăng nhập", async ({ page }) => {

    // ── Landing page — hero ──
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await captureStep(page, {
      module: "01-cong-dan",
      file: "01-landing-hero",
      title: "Trang chủ CivicAI",
      description: "Trang giới thiệu hệ thống CivicAI dành cho cán bộ công chức phường/xã.",
    });

    // ── Landing page — kéo xuống phần tính năng ──
    await page.evaluate(() => window.scrollBy(0, 600));
    await page.waitForTimeout(400);
    await captureStep(page, {
      module: "01-cong-dan",
      file: "02-landing-features",
      title: "Các tính năng chính",
      description: "7 tác tử AI và các nhóm tính năng của CivicAI.",
    });

    // ── ChatWidget — mở ──
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(300);
    await page.click('button[aria-label="Mở trợ lý AI"]');
    await page.waitForTimeout(600);
    await captureStep(page, {
      module: "01-cong-dan",
      file: "03-chatwidget-open",
      title: "Trợ lý ảo (ChatWidget)",
      description: "Cửa sổ chat hỏi đáp dành cho người dân về thủ tục hành chính.",
    });

    // ── ChatWidget — nhập câu hỏi ──
    const chatInput = page.locator('textarea[placeholder*="câu hỏi"]');
    await chatInput.fill("Thủ tục đăng ký khai sinh cần giấy tờ gì?");
    await page.waitForTimeout(200);
    await captureStep(page, {
      module: "01-cong-dan",
      file: "04-chatwidget-typing",
      title: "Nhập câu hỏi",
      description: "Người dân nhập câu hỏi về thủ tục đăng ký khai sinh.",
      highlightSelector: 'textarea[placeholder*="câu hỏi"]',
    });

    // ── Đăng nhập — trang trống ──
    await page.goto("/login");
    await page.waitForLoadState("networkidle");
    await captureStep(page, {
      module: "02-dang-nhap",
      file: "01-login-page",
      title: "Trang đăng nhập",
      description: "Giao diện đăng nhập 2 cột của CivicAI.",
    });

    // ── Đăng nhập — đã điền, highlight nút submit ──
    await page.fill('input[type="email"]',    TEST_USER.email);
    await page.fill('input[type="password"]', TEST_USER.password);
    await page.waitForTimeout(200);
    await captureStep(page, {
      module: "02-dang-nhap",
      file: "02-login-filled",
      title: "Nhập thông tin đăng nhập",
      description: "Điền email và mật khẩu trước khi bấm Đăng nhập.",
      highlightSelector: 'button[type="submit"]',
    });

    // ── Dashboard sau đăng nhập ──
    await page.click('button[type="submit"]');
    await page.waitForURL("**/dashboard**", { timeout: 15_000 });
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(500);
    await captureStep(page, {
      module: "03-tong-quan",
      file: "01-dashboard-overview",
      title: "Trang Tổng quan sau khi đăng nhập",
      description: "Màn hình Tổng quan với 4 metric card và panel Kho tri thức.",
    });
  });
});
