import * as path from "path";
import { test } from "@playwright/test";
import { captureStep, login } from "./doc-helpers";

const DEMO_DIR = path.join(__dirname, "..", "..", "docs", "demo OCR");
const TEXT_PDF = path.join(DEMO_DIR, "Mau-CT01-tt53.pdf");
const SCANNED_PDF = path.join(DEMO_DIR, "30.signed_1-3.pdf");

test.describe("Doc screenshots: OCR", () => {

  // ── TEST 1: PDF văn bản (text-based) — nhanh ─────────────────────────────
  test("OCR - PDF văn bản (text)", async ({ page }) => {
    test.setTimeout(60_000);

    await login(page);
    await page.goto("/dashboard/ocr/new");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(500);

    // 01 — dropzone trống
    await captureStep(page, {
      module: "08-ocr",
      file: "01-dropzone",
      title: "Tải lên file để OCR",
      description:
        "Hỗ trợ PDF văn bản, PDF scan/ảnh chụp, và file ảnh (JPG, PNG). Hệ thống tự nhận diện loại file.",
      highlightSelector: "div.border-2.border-dashed.rounded-lg",
    });

    // Upload PDF văn bản
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(TEXT_PDF);
    await page.waitForTimeout(500);

    // Bắt đầu OCR — button chỉ xuất hiện sau khi có file
    const startBtn = page
      .locator("button.w-full")
      .filter({ hasText: /Bắt đầu OCR/i });
    await startBtn.click();

    // 02 — processing (chụp nhanh, text_pdf xử lý nhanh ~5-15s)
    await page.waitForTimeout(800);
    await captureStep(page, {
      module: "08-ocr",
      file: "02-processing-text-pdf",
      title: "Đang xử lý — PDF văn bản",
      description:
        "Hệ thống trích xuất văn bản trực tiếp từ PDF (không cần OCR ảnh), xử lý nhanh.",
    });

    // Chờ done
    await page.waitForSelector("text=Hoàn tất!", { timeout: 30_000 });
    await page.waitForTimeout(1500);

    // 03 — kết quả PDF văn bản
    await captureStep(page, {
      module: "08-ocr",
      file: "03-ket-qua-text-pdf",
      title: "Kết quả OCR — PDF văn bản",
      description:
        "Văn bản được trích xuất trực tiếp, độ chính xác cao, kèm xem trước nội dung PDF gốc.",
    });
  });

  // ── TEST 2: PDF hình ảnh (scanned) — chậm hơn ────────────────────────────
  test("OCR - PDF hình ảnh (scan)", async ({ page }) => {
    test.setTimeout(180_000);

    await login(page);
    await page.goto("/dashboard/ocr/new");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(500);

    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(SCANNED_PDF);
    await page.waitForTimeout(500);

    const startBtn = page
      .locator("button.w-full")
      .filter({ hasText: /Bắt đầu OCR/i });
    await startBtn.click();

    // 04 — processing (chờ 5s để thấy progress > 0% với scanned PDF)
    await page.waitForTimeout(5000);
    await captureStep(page, {
      module: "08-ocr",
      file: "04-processing-scanned-pdf",
      title: "Đang xử lý — PDF hình ảnh (scan)",
      description:
        "Với file scan/ảnh chụp, hệ thống dùng OCR để nhận diện từng trang (hiển thị tiến độ theo số trang).",
    });

    // Chờ done — timeout dài cho scanned PDF (~3 trang × 20-30s)
    await page.waitForSelector("text=Hoàn tất!", { timeout: 150_000 });
    await page.waitForTimeout(1500);

    // 05 — kết quả PDF scan
    await captureStep(page, {
      module: "08-ocr",
      file: "05-ket-qua-scanned-pdf",
      title: "Kết quả OCR — PDF hình ảnh",
      description:
        "Nội dung được nhận diện từ ảnh scan, có thể chỉnh sửa lại nếu OCR chưa chính xác hoàn toàn.",
    });
  });

  // ── TEST 3: Danh sách OCR jobs ────────────────────────────────────────────
  test("OCR - Danh sách jobs", async ({ page }) => {
    test.setTimeout(30_000);

    await login(page);
    await page.goto("/dashboard/ocr");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1000);

    // 06 — danh sách (sau 2 test trên, có ít nhất 1 job done)
    await captureStep(page, {
      module: "08-ocr",
      file: "06-danh-sach-jobs",
      title: "Danh sách file đã xử lý OCR",
      description:
        "Theo dõi trạng thái xử lý, xem lại kết quả, tải Word/PDF hoặc xóa. Badge màu xanh = Hoàn tất, vàng = Đang xử lý.",
      highlightSelector: 'a[href="/dashboard/ocr/new"]',
    });
  });
});
