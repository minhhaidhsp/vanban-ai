import { test } from "@playwright/test";
import { captureStep, login } from "./doc-helpers";

// Dùng doc mẫu đã INSERT sẵn để navigate ?new=true, tránh tạo "Văn bản mới" rác
const DEMO_DOC_ID = "a1b2c3d4-0001-4e88-8ee4-ef1234567801";

test.describe("Doc screenshots: Tổng quan & Tài liệu", () => {
  test("Tổng quan & Tài liệu", async ({ page }) => {

    await login(page);

    // ── Tổng quan — đợi networkidle sau redirect ──
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(400);
    await captureStep(page, {
      module: "03-tong-quan",
      file: "02-dashboard-detail",
      title: "Trang Tổng quan",
      description: "Thống kê tổng quan: số văn bản, kho tri thức 272 văn bản, 7.525 đoạn, 93% độ phủ.",
    });

    await captureStep(page, {
      module: "03-tong-quan",
      file: "03-sidebar-nav",
      title: "Menu điều hướng",
      description: "Sidebar bên trái với 3 nhóm: NGHIỆP VỤ, KHO TRI THỨC, HỆ THỐNG.",
      highlightSelector: "aside",
    });

    // ── Tài liệu — danh sách ──
    await page.goto("/dashboard/documents");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(800); // đợi bảng render xong
    await captureStep(page, {
      module: "04-tai-lieu",
      file: "01-document-list",
      title: "Danh sách văn bản",
      description: "Danh sách văn bản đã soạn thảo, có lọc theo loại, tìm kiếm và sắp xếp.",
    });

    // Highlight nút "Soạn văn bản mới" (đúng text thực tế trong code)
    await captureStep(page, {
      module: "04-tai-lieu",
      file: "02-new-document-button",
      title: "Tạo văn bản mới",
      description: "Nhấn nút Soạn văn bản mới để bắt đầu soạn thảo.",
      highlightSelector: 'button:has(svg + *)',   // nút có icon Plus + text
    });

    // ── WelcomePanel — dùng ?new=true trên doc mẫu, không tạo rác ──
    await page.goto(`/dashboard/documents/${DEMO_DOC_ID}?new=true`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(600);

    // Tab mặc định "Chọn template"
    await captureStep(page, {
      module: "04-tai-lieu",
      file: "03-welcome-panel-templates",
      title: "Chọn loại văn bản theo mẫu",
      description: "18 loại văn bản theo Nghị định 30/2020/NĐ-CP — chọn 1 loại để bắt đầu với cấu trúc có sẵn.",
    });

    // ── Tab "Tạo bằng AI" ──
    await page.getByRole("button", { name: /Tạo bằng AI/i }).click();
    await page.waitForTimeout(300);

    // Điền yêu cầu mẫu chỉn chu trước khi chụp
    const aiTextarea = page.locator('textarea[placeholder*="Mô tả"]');
    await aiTextarea.fill(
      "Soạn thông báo về việc nghỉ lễ Quốc khánh 2/9 cho cán bộ, công chức " +
      "UBND phường, thời gian nghỉ từ ngày 02/9 đến hết ngày 03/9/2026, " +
      "yêu cầu các bộ phận trực ban đảm bảo an ninh trật tự."
    );
    await page.waitForTimeout(200);
    await captureStep(page, {
      module: "04-tai-lieu",
      file: "04-welcome-panel-ai",
      title: "Tạo văn bản bằng AI",
      description: "Nhập yêu cầu bằng tiếng Việt tự nhiên, AI soạn đầy đủ cấu trúc theo NĐ30.",
      highlightSelector: 'textarea[placeholder*="Mô tả"]',
    });

    // ── Tab "Trang trắng" ──
    await page.getByRole("button", { name: /Trang trắng/i }).click();
    await page.waitForTimeout(300);
    await captureStep(page, {
      module: "04-tai-lieu",
      file: "05-welcome-panel-blank",
      title: "Bắt đầu với trang trắng",
      description: "Soạn thảo tự do hoặc upload file PDF/Word/ảnh để trích xuất nội dung bằng OCR.",
    });

    // Không submit — WelcomePanel chỉ dùng để chụp
    // Doc mẫu DEMO_DOC_ID không bị thay đổi (chỉ xem WelcomePanel)
  });
});
