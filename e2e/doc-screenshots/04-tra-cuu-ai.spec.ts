import { test } from "@playwright/test";
import { captureStep, login } from "./doc-helpers";

test.describe("Doc screenshots: Tra cứu AI", () => {
  test.setTimeout(120_000);

  test("Tra cứu AI", async ({ page }) => {

    await login(page);
    await page.goto("/dashboard/rag-search");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1000);

    // ── 01: Empty state ──────────────────────────────────────────────────────
    await captureStep(page, {
      module: "06-tra-cuu-ai",
      file: "01-empty-state",
      title: "Trang Tra cứu AI",
      description:
        "Giao diện chat hỏi đáp nghiệp vụ. Sidebar điều hướng tự thu gọn. 3 câu hỏi gợi ý để cán bộ bắt đầu nhanh.",
    });

    const textarea = page.locator('textarea[placeholder*="Hỏi tiếp"]');
    const sendBtn = page.locator('button[title="Gửi"]');

    // ── 02: Nhập câu hỏi — zoom input box ───────────────────────────────────
    await textarea.fill(
      "Thẩm quyền ban hành văn bản hành chính cấp phường, xã thuộc về ai?"
    );
    await captureStep(page, {
      module: "06-tra-cuu-ai",
      file: "02-nhap-cau-hoi",
      title: "Nhập câu hỏi — zoom ô nhập liệu",
      description:
        "Ô nhập liệu rounded-3xl với mic (giọng nói vi-VN) và nút gửi. Gửi bằng Enter hoặc nút mũi tên.",
      clipSelector: "div.rounded-3xl.border.bg-background",
      clipPadding: 8,
    });

    // ── Gửi + capture progress steps ────────────────────────────────────────
    await sendBtn.click();

    // Chờ spinner xuất hiện (xác nhận search đã start)
    try {
      await page.waitForSelector(".animate-spin", { timeout: 5_000 });
    } catch {}

    // ── 02b: Progress steps (spinner đang quay) ──────────────────────────────
    await captureStep(page, {
      module: "06-tra-cuu-ai",
      file: "02b-progress-steps",
      title: "Đang xử lý câu hỏi",
      description:
        "Hệ thống hiển thị tiến trình xử lý: tìm kiếm ngữ nghĩa trong kho văn bản → xếp hạng kết quả → tổng hợp câu trả lời.",
    });

    // Chờ kết quả xong
    await page.waitForSelector(".animate-spin", {
      state: "hidden",
      timeout: 60_000,
    });
    await page.waitForTimeout(800);

    // ── 03: Câu trả lời đầy đủ ──────────────────────────────────────────────
    await captureStep(page, {
      module: "06-tra-cuu-ai",
      file: "03-cau-tra-loi",
      title: "Câu trả lời có cấu trúc",
      description:
        "Câu trả lời theo 5 mục: Trả lời trực tiếp, Căn cứ pháp lý, Nội dung chi tiết, Thẩm quyền, Lưu ý nghiệp vụ. Kèm độ tin cậy và nguồn trích dẫn.",
    });

    // ── 03b: Zoom bubble câu trả lời ─────────────────────────────────────────
    // Tại bước này chỉ có 1 answer bubble → querySelector lấy đúng
    await captureStep(page, {
      module: "06-tra-cuu-ai",
      file: "03b-cau-tra-loi-zoom",
      title: "Chi tiết câu trả lời — zoom",
      description:
        "Cấu trúc 5 mục rõ ràng với heading teal. Citation [1][2] là button có thể click để xem nguồn. Nguồn trích dẫn dạng pill bên dưới.",
      clipSelector: "div.rounded-lg.border.bg-card.p-4",
      clipPadding: 12,
    });

    // ── 04: Click citation [1] → sidebar ────────────────────────────────────
    const citationBtn = page
      .locator('button[title="Xem nguồn [1]"]')
      .first();
    if ((await citationBtn.count()) > 0) {
      await citationBtn.click();
      await page.waitForTimeout(500);
    }

    await captureStep(page, {
      module: "06-tra-cuu-ai",
      file: "04-citation-sidebar",
      title: "Xem nguồn trích dẫn",
      description:
        "Click vào số trích dẫn để xem chi tiết văn bản nguồn. Panel bên phải hiển thị tên văn bản, số ký hiệu, điều khoản và nội dung đoạn trích.",
    });

    // ── 04b: Zoom citation sidebar ───────────────────────────────────────────
    await captureStep(page, {
      module: "06-tra-cuu-ai",
      file: "04b-citation-zoom",
      title: "Chi tiết nguồn trích dẫn — zoom",
      description:
        "Sidebar fixed 400px bên phải: header, điều hướng 1/N nguồn (← Trước / Tiếp →), nội dung đoạn văn bản gốc.",
      clipSelector: "div.fixed.right-0.top-0",
      clipPadding: 0,
    });

    // Đóng citation sidebar
    const closeCitation = page
      .locator("div.fixed.right-0.top-0")
      .locator("button")
      .first();
    if ((await closeCitation.count()) > 0) {
      await closeCitation.click();
      await page.waitForTimeout(300);
    }

    // ── 05: Multi-turn ───────────────────────────────────────────────────────
    await textarea.fill(
      "Cụ thể UBND cấp xã được ban hành những loại văn bản nào?"
    );
    await sendBtn.click();

    try {
      await page.waitForSelector(".animate-spin", { timeout: 5_000 });
    } catch {}
    await page.waitForSelector(".animate-spin", {
      state: "hidden",
      timeout: 60_000,
    });
    await page.waitForTimeout(500);

    await captureStep(page, {
      module: "06-tra-cuu-ai",
      file: "05-multi-turn",
      title: "Hỏi tiếp theo ngữ cảnh",
      description:
        "Hệ thống ghi nhớ ngữ cảnh cuộc hội thoại, câu hỏi tiếp theo không cần nhắc lại chủ đề.",
    });

    // ── 06: History panel ────────────────────────────────────────────────────
    await captureStep(page, {
      module: "06-tra-cuu-ai",
      file: "06-history-panel",
      title: "Lịch sử tra cứu",
      description:
        "Cột trái lưu lại các cuộc tra cứu. Session hiện tại được tô đậm. Có thể xóa hoặc thu gọn cột lịch sử.",
      highlightSelector: 'button[title="Thu gọn"]',
    });

    // ── 07: Collapse ─────────────────────────────────────────────────────────
    await page.locator('button[title="Thu gọn"]').click();
    await page.waitForTimeout(300);

    await captureStep(page, {
      module: "06-tra-cuu-ai",
      file: "07-history-collapsed",
      title: "Thu gọn lịch sử tra cứu",
      description:
        "Khi thu gọn, khu vực chat chiếm toàn màn hình. Nút nhỏ bên trái để mở lại lịch sử.",
      highlightSelector: 'button[title="Mở lịch sử tra cứu"]',
    });

    // Mở lại
    await page.locator('button[title="Mở lịch sử tra cứu"]').click();
    await page.waitForTimeout(300);

    // ── 08: Cuộc tra cứu mới — FIX: button.w-full.border ────────────────────
    await captureStep(page, {
      module: "06-tra-cuu-ai",
      file: "08-new-session",
      title: "Bắt đầu cuộc tra cứu mới",
      description:
        "Nhấn 'Cuộc tra cứu mới' để mở session mới. Cuộc tra cứu hiện tại được lưu và có thể quay lại.",
      // button.w-full.border: unique — 'Đăng xuất' (Button variant=ghost) không có class 'border'
      highlightSelector: "button.w-full.border",
    });
  });
});
