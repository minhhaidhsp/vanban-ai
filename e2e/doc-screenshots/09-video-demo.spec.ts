import * as path from "path";
import { test } from "@playwright/test";
import { login, loginAs, TEST_ADMIN } from "./doc-helpers";

const DEMO_DOC_ID = "a1b2c3d4-0001-4e88-8ee4-ef1234567801";
const LOI_DOC_ID  = "a1b2c3d4-0006-4e88-8ee4-ef1234567806";
const TEXT_PDF    = path.join(__dirname, "..", "..", "docs", "demo OCR", "Mau-CT01-tt53.pdf");

test.describe("Video demo: Toàn trình CivicAI", () => {
  test.setTimeout(600_000); // 10 phút — LLM calls + OCR thật

  test("Toàn trình 10 phân hệ", async ({ page }) => {

    // ═══════════════════════════════════════════════════════════════
    // 1. CỔNG CÔNG DÂN
    // ═══════════════════════════════════════════════════════════════

    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1500);

    // Kéo xuống phần tính năng
    await page.evaluate(() => window.scrollBy(0, 600));
    await page.waitForTimeout(1500);

    // Scroll về đầu, mở ChatWidget
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(500);
    await page.click('button[aria-label="Mở trợ lý AI"]');
    await page.waitForTimeout(1000);

    // Nhập câu hỏi (không submit — tránh chờ LLM ở bước demo công dân)
    const chatWidget = page.locator('textarea[placeholder*="câu hỏi"]');
    await chatWidget.fill("Thủ tục đăng ký khai sinh cần giấy tờ gì?");
    await page.waitForTimeout(1500);

    // ═══════════════════════════════════════════════════════════════
    // 2. ĐĂNG NHẬP
    // ═══════════════════════════════════════════════════════════════

    await page.goto("/login");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1000);

    await page.fill('input[type="email"]',    "demo@civicai.vn");
    await page.fill('input[type="password"]', "Demo@2026");
    await page.waitForTimeout(800);
    await page.click('button[type="submit"]');
    await page.waitForURL("**/dashboard**", { timeout: 15_000 });
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    // ═══════════════════════════════════════════════════════════════
    // 3. TỔNG QUAN
    // ═══════════════════════════════════════════════════════════════

    // (đã ở /dashboard sau login — dừng để xem metrics)
    await page.waitForTimeout(2000);

    // ═══════════════════════════════════════════════════════════════
    // 4. QUẢN LÝ TÀI LIỆU
    // ═══════════════════════════════════════════════════════════════

    await page.goto("/dashboard/documents");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1500);

    // WelcomePanel — tab Template
    await page.goto(`/dashboard/documents/${DEMO_DOC_ID}?new=true`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1000);

    // Tab Tạo bằng AI
    await page.getByRole("button", { name: /Tạo bằng AI/i }).click();
    await page.waitForTimeout(600);
    const aiTextarea = page.locator('textarea[placeholder*="Mô tả"]');
    await aiTextarea.fill(
      "Soạn thông báo về việc nghỉ lễ Quốc khánh 2/9 cho cán bộ, công chức " +
      "UBND phường, thời gian nghỉ từ ngày 02/9 đến hết ngày 03/9/2026, " +
      "yêu cầu các bộ phận trực ban đảm bảo an ninh trật tự."
    );
    await page.waitForTimeout(1500);

    // Tab Trang trắng
    await page.getByRole("button", { name: /Trang trắng/i }).click();
    await page.waitForTimeout(1500);

    // ═══════════════════════════════════════════════════════════════
    // 5. SOẠN THẢO EDITOR
    // ═══════════════════════════════════════════════════════════════

    await page.goto(`/dashboard/documents/${DEMO_DOC_ID}`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1500);

    // Focus editor — toolbar hiện ra
    const editorArea = page.locator(".ProseMirror").first();
    if (await editorArea.count() > 0) {
      await editorArea.click();
      await page.waitForTimeout(600);
    }

    // Tab Công cụ → 9 AI tools
    const toolsTab = page.locator('button:has-text("Công cụ")').first();
    await toolsTab.click();
    await page.waitForTimeout(800);

    // Căn cứ pháp lý — gọi LLM thật
    const legalBtn = page.locator('button:has-text("Căn cứ pháp lý")');
    await legalBtn.click();
    await page.waitForTimeout(15_000); // chờ kết quả LLM

    // Chat AI — nhập câu hỏi
    const chatTab = page.locator('button:has-text("Chat AI")').first();
    await chatTab.click();
    await page.waitForTimeout(600);
    const editorChat = page.locator('textarea[placeholder*="Nhập câu hỏi"]');
    await editorChat.fill("Văn bản này cần gửi cho cơ quan nào?");
    await page.waitForTimeout(1000);

    // Scroll đến phần ký
    await page.evaluate(() => {
      const el = document.querySelector("select.appearance-none");
      if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
    });
    await page.waitForTimeout(1500);

    // Xem trước
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(500);
    const previewBtn = page.locator('button:has-text("Xem trước")');
    await previewBtn.click();
    await page.waitForTimeout(2000);

    // Rà soát — document có 4 lỗi cố ý
    await page.goto(`/dashboard/documents/${LOI_DOC_ID}`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1500);

    const toolsTab2 = page.locator('button:has-text("Công cụ")').first();
    await toolsTab2.click();
    await page.waitForTimeout(600);

    const reviewBtn = page.getByRole("button", { name: "Rà soát", exact: true });
    await reviewBtn.click();
    await page.waitForTimeout(20_000); // chờ kết quả LLM

    // ═══════════════════════════════════════════════════════════════
    // 6. TRA CỨU AI
    // ═══════════════════════════════════════════════════════════════

    await page.goto("/dashboard/rag-search");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1500);

    const ragTextarea = page.locator('textarea[placeholder*="Hỏi tiếp"]');
    const sendBtn     = page.locator('button[title="Gửi"]');

    // Câu hỏi 1
    await ragTextarea.fill(
      "Thẩm quyền ban hành văn bản hành chính cấp phường, xã thuộc về ai?"
    );
    await page.waitForTimeout(1000);
    await sendBtn.click();

    // Chờ spinner → kết quả
    try { await page.waitForSelector(".animate-spin", { timeout: 5_000 }); } catch {}
    await page.waitForTimeout(500);
    await page.waitForSelector(".animate-spin", { state: "hidden", timeout: 60_000 });
    await page.waitForTimeout(1500);

    // Xem trích dẫn [1]
    const citationBtn = page.locator('button[title="Xem nguồn [1]"]').first();
    if ((await citationBtn.count()) > 0) {
      await citationBtn.click();
      await page.waitForTimeout(1500);
      const closeBtn = page.locator("div.fixed.right-0.top-0").locator("button").first();
      if ((await closeBtn.count()) > 0) {
        await closeBtn.click();
        await page.waitForTimeout(800);
      }
    }

    // Câu hỏi 2 — multi-turn
    await ragTextarea.fill(
      "Cụ thể UBND cấp xã được ban hành những loại văn bản nào?"
    );
    await page.waitForTimeout(800);
    await sendBtn.click();

    try { await page.waitForSelector(".animate-spin", { timeout: 5_000 }); } catch {}
    await page.waitForSelector(".animate-spin", { state: "hidden", timeout: 60_000 });
    await page.waitForTimeout(1500);

    // Thu gọn / mở lại lịch sử
    const collapseBtn = page.locator('button[title="Thu gọn"]');
    if ((await collapseBtn.count()) > 0) {
      await collapseBtn.click();
      await page.waitForTimeout(1500);
      const expandBtn = page.locator('button[title="Mở lịch sử tra cứu"]');
      if ((await expandBtn.count()) > 0) {
        await expandBtn.click();
        await page.waitForTimeout(1000);
      }
    }

    // Highlight nút "Cuộc tra cứu mới"
    await page.evaluate(() => {
      const el = document.querySelector("button.w-full.border") as HTMLElement | null;
      if (el) {
        el.style.outline = "3px solid #ef4444";
        el.style.boxShadow = "0 0 0 6px rgba(239,68,68,0.25)";
      }
    });
    await page.waitForTimeout(1500);

    // ═══════════════════════════════════════════════════════════════
    // 7. KHO VĂN BẢN
    // ═══════════════════════════════════════════════════════════════

    await page.goto("/dashboard/reference-docs");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1000);

    // Tab Hệ thống — 272 văn bản
    await page.locator("button").filter({ hasText: "Hệ thống" }).click();
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1500);

    // Focus ô tìm kiếm
    await page.locator('input[placeholder="Tìm kiếm văn bản..."]').focus();
    await page.waitForTimeout(1000);

    // Highlight nút Upload hàng loạt
    await page.evaluate(() => {
      const el = document.querySelector("button.border-gray-300") as HTMLElement | null;
      if (el) {
        el.style.outline = "3px solid #ef4444";
        el.style.boxShadow = "0 0 0 6px rgba(239,68,68,0.25)";
      }
    });
    await page.waitForTimeout(1500);

    // ═══════════════════════════════════════════════════════════════
    // 8. OCR — PDF văn bản (nhanh ~15s)
    // ═══════════════════════════════════════════════════════════════

    await page.goto("/dashboard/ocr/new");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1000);

    // Upload file
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(TEXT_PDF);
    await page.waitForTimeout(800);

    // Bắt đầu OCR
    const startBtn = page.locator("button.w-full").filter({ hasText: /Bắt đầu OCR/i });
    await startBtn.click();
    await page.waitForTimeout(1000);

    // Chờ xong — text_pdf nhanh (~15s)
    await page.waitForSelector("text=Hoàn tất!", { timeout: 60_000 });
    await page.waitForTimeout(2000);

    // Danh sách jobs
    await page.goto("/dashboard/ocr");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1500);

    // ═══════════════════════════════════════════════════════════════
    // 9. TÀI KHOẢN & CÀI ĐẶT
    // ═══════════════════════════════════════════════════════════════

    await page.goto("/dashboard/profile");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1500);

    // Highlight ô họ tên
    await page.locator("input#full_name").focus();
    await page.waitForTimeout(1000);

    await page.goto("/dashboard/settings");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1500);

    // Highlight ô tên cơ quan
    await page.locator("input#ten_co_quan").focus();
    await page.waitForTimeout(1000);

    // ═══════════════════════════════════════════════════════════════
    // 10. QUẢN LÝ USER & ĐĂNG XUẤT
    // ═══════════════════════════════════════════════════════════════

    // Đăng nhập lại admin — cùng page, video không bị cắt
    await loginAs(page, TEST_ADMIN);
    await page.waitForTimeout(1000);

    await page.goto("/dashboard/admin");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    // Quay về dashboard để chụp nút Đăng xuất trong sidebar
    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1500);

    // Highlight nút Đăng xuất (không click)
    await page.evaluate(() => {
      const el = document.querySelector("button.w-full.gap-3") as HTMLElement | null;
      if (el) {
        el.style.outline = "3px solid #ef4444";
        el.style.boxShadow = "0 0 0 6px rgba(239,68,68,0.25)";
      }
    });
    await page.waitForTimeout(2000);
  });
});
