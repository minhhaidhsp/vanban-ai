import { test } from "@playwright/test";
import { captureStep, login } from "./doc-helpers";

// Công văn đề nghị phối hợp — document sạch cho overview/toolbar/tools
const DEMO_DOC_ID = "a1b2c3d4-0001-4e88-8ee4-ef1234567801";

// Công văn chào Tết — có 4 lỗi cố ý cho demo Rà soát
const LOI_DOC_ID = "a1b2c3d4-0006-4e88-8ee4-ef1234567806";

test.describe("Doc screenshots: Soạn thảo (Editor)", () => {
  test("Soạn thảo văn bản", async ({ page }) => {

    await login(page);

    // ── 01: Tổng quan giao diện editor ──────────────────────────────────────
    await page.goto(`/dashboard/documents/${DEMO_DOC_ID}`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1200);

    await captureStep(page, {
      module: "05-soan-thao",
      file: "01-editor-overview",
      title: "Giao diện soạn thảo văn bản",
      description:
        "Giao diện chính gồm: cột trái (tài liệu tham chiếu), khu vực soạn thảo giữa (theo thể thức NĐ30), và cột phải (công cụ AI).",
    });

    // ── 02: Toolbar — ZOOM vào dải định dạng ────────────────────────────────
    // Click vào vùng soạn thảo để toolbar hiện ra (chỉ hiện khi editor focused)
    const editorArea = page.locator(".ProseMirror").first();
    if (await editorArea.count() > 0) {
      await editorArea.click();
      await page.waitForTimeout(400);
    }

    await captureStep(page, {
      module: "05-soan-thao",
      file: "02-toolbar-zoom",
      title: "Thanh công cụ định dạng",
      description:
        "Định dạng văn bản: in đậm, in nghiêng, gạch dưới, căn lề, font chữ, giãn dòng.",
      // Wrapper của EditorToolbar là child trực tiếp của div.sticky (toolbar sticky)
      // ".sticky > .border-b" loại trừ header (header IS sticky, không phải child của sticky)
      clipSelector: ".sticky > .border-b.bg-white.shadow-sm",
      clipPadding: 12,
    });

    // ── 03: Cột trái — Tài liệu tham chiếu ─────────────────────────────────
    await captureStep(page, {
      module: "05-soan-thao",
      file: "03-sources-panel",
      title: "Tài liệu tham chiếu",
      description:
        "Cột trái hiển thị các văn bản pháp lý liên quan, có thể kéo để thay đổi độ rộng.",
    });

    // ── 04: Tab Công cụ — 9 công cụ AI — ZOOM ───────────────────────────────
    const toolsTab = page.locator('button:has-text("Công cụ")').first();
    await toolsTab.click();
    await page.waitForTimeout(400);

    await captureStep(page, {
      module: "05-soan-thao",
      file: "04-rightpanel-tools-overview",
      title: "9 công cụ AI hỗ trợ soạn thảo",
      description:
        "Công cụ AI nhóm theo màu: Rà soát/Chuẩn thể thức/Chuẩn văn phong (teal), Tóm tắt/Bảng số liệu/Gợi ý tiếp/Căn cứ pháp lý (blue), So sánh (amber), Hỏi đáp (slate).",
      // Grid 9 công cụ trong RightPanel.tsx (dòng 940)
      clipSelector: ".grid-cols-3.gap-2.mb-4",
      clipPadding: 16,
    });

    // ── 05: Demo "Căn cứ pháp lý" ───────────────────────────────────────────
    const legalBtn = page.locator('button:has-text("Căn cứ pháp lý")');
    await legalBtn.click();
    // Chờ LLM trả kết quả — tối đa 20s, chụp dù có kết quả hay không
    await page.waitForTimeout(15000);
    await captureStep(page, {
      module: "05-soan-thao",
      file: "05-tool-can-cu-phap-ly",
      title: "Công cụ Căn cứ pháp lý",
      description:
        "AI tự động tìm và liệt kê các căn cứ pháp lý liên quan đến nội dung văn bản.",
    });

    // ── 06: Tab Chat AI ──────────────────────────────────────────────────────
    const chatTab = page.locator('button:has-text("Chat AI")').first();
    await chatTab.click();
    await page.waitForTimeout(400);

    const chatInput = page.locator('textarea[placeholder*="Nhập câu hỏi"]');
    await chatInput.fill("Văn bản này cần gửi cho cơ quan nào?");
    await page.waitForTimeout(200);

    await captureStep(page, {
      module: "05-soan-thao",
      file: "06-chat-ai-tab",
      title: "Hỏi đáp tự do với AI",
      description:
        "Cán bộ có thể hỏi AI bất kỳ câu hỏi liên quan đến văn bản đang soạn thảo.",
      highlightSelector: 'textarea[placeholder*="Nhập câu hỏi"]',
    });

    // ── 07: Phần chữ ký — ZOOM ──────────────────────────────────────────────
    // Scroll đến phần ký (cuối document)
    await page.evaluate(() => {
      const el = document.querySelector("select.appearance-none");
      if (el) el.scrollIntoView({ behavior: "instant", block: "center" });
    });
    await page.waitForTimeout(400);

    await captureStep(page, {
      module: "05-soan-thao",
      file: "07-signature-section",
      title: "Phần ký — chọn quyền hạn ký",
      description:
        "Chọn quyền hạn ký phù hợp: TM. (Thừa mệnh), KT. (Ký thay), TL. (Thừa lệnh), TUQ. (Thừa ủy quyền).",
      // Chữ ký select chỉ có duy nhất class "appearance-none" (các select toolbar có thêm nhiều class khác)
      highlightSelector: 'select[class="appearance-none"]',
      clipSelector: 'select[class="appearance-none"]',
      clipPadding: 100,
    });

    // ── 08: Xem trước ────────────────────────────────────────────────────────
    // Scroll về đầu trang trước khi click Xem trước
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(300);

    const previewBtn = page.locator('button:has-text("Xem trước")');
    await previewBtn.click();
    await page.waitForTimeout(1500);

    await captureStep(page, {
      module: "05-soan-thao",
      file: "08-preview-mode",
      title: "Xem trước văn bản",
      description:
        "Xem trước văn bản theo đúng định dạng A4 trước khi xuất file.",
    });

    // ── 09: Demo "Rà soát" trên document có 4 lỗi cố ý ─────────────────────
    // page.goto tự thoát preview do unmount component
    await page.goto(`/dashboard/documents/${LOI_DOC_ID}`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1200);

    const toolsTab2 = page.locator('button:has-text("Công cụ")').first();
    await toolsTab2.click();
    await page.waitForTimeout(400);

    // exact:true tránh khớp với tiêu đề document "...(demo rà soát)"
    const reviewBtn = page.getByRole('button', { name: 'Rà soát', exact: true });
    await reviewBtn.click();
    // Chờ LLM — tối đa 20s, chụp dù có kết quả hay không
    await page.waitForTimeout(20000);

    await captureStep(page, {
      module: "05-soan-thao",
      file: "09-tool-ra-soat",
      title: "Công cụ Rà soát văn bản",
      description:
        'AI tự động phát hiện lỗi chính tả, thể thức, văn phong và đề xuất sửa. Document demo chứa: "Kính gởi", "CHỦ TICH", "tết nguyên đán" viết thường, và ngôn ngữ không trang trọng.',
    });
  });
});
