import { test } from "@playwright/test";
import { captureStep, login } from "./doc-helpers";

test.describe("Doc screenshots: Kho văn bản", () => {
  test.setTimeout(60_000);

  test("Kho văn bản", async ({ page }) => {

    await login(page);
    await page.goto("/dashboard/reference-docs");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1000);

    // Switch to "Hệ thống" tab to show all 272 system documents
    await page.locator("button").filter({ hasText: "Hệ thống" }).click();
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(800);

    // ── 01: Tổng quan danh sách ────────────────────────────────────────────
    await captureStep(page, {
      module: "07-kho-van-ban",
      file: "01-danh-sach",
      title: "Kho tri thức — 272 văn bản hệ thống",
      description:
        "Danh sách văn bản pháp luật được tổ chức theo 3 tab: Của tôi / Cơ quan / Hệ thống. Badge số lượng hiển thị ngay trên tab. Tìm kiếm + lọc theo loại và hiệu lực.",
    });

    // ── 02: Filter bar ─────────────────────────────────────────────────────
    await captureStep(page, {
      module: "07-kho-van-ban",
      file: "02-filter-bar",
      title: "Tìm kiếm và lọc văn bản",
      description:
        "Tìm kiếm toàn văn bản kết hợp lọc theo Loại văn bản (Nghị định, Thông tư...) và Hiệu lực (Còn/Hết/Một phần).",
      highlightSelector: 'input[placeholder="Tìm kiếm văn bản..."]',
      clipSelector: "div.flex.flex-wrap.gap-3",
      clipPadding: 20,
    });

    // ── 03: Nút upload ─────────────────────────────────────────────────────
    await captureStep(page, {
      module: "07-kho-van-ban",
      file: "03-upload-options",
      title: "Thêm văn bản tham chiếu",
      description:
        "Hai phương thức nhập: Upload hàng loạt với AI tự động trích xuất metadata, hoặc Nhập thủ công từng văn bản.",
      highlightSelector: "button.border-gray-300",
    });
  });
});
