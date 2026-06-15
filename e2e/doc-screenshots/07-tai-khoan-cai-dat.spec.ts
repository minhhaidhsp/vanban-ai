import { test } from "@playwright/test";
import { captureStep, login } from "./doc-helpers";

test.describe("Doc screenshots: Tài khoản & Cài đặt", () => {
  test.setTimeout(60_000);

  test("Tài khoản & Cài đặt", async ({ page }) => {

    await login(page);

    // ══════════════════════════════════════════════════════════════════════
    // PHÂN HỆ 9: TÀI KHOẢN (/dashboard/profile)
    // 2 Card: Thông tin cá nhân | Đổi mật khẩu
    // ══════════════════════════════════════════════════════════════════════

    await page.goto("/dashboard/profile");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(500);

    // ── 01: Card 1 — Thông tin cá nhân (avatar + họ tên + email) ─────────
    await captureStep(page, {
      module: "09-tai-khoan",
      file: "01-thong-tin-ca-nhan",
      title: "Thông tin cá nhân",
      description:
        "Cập nhật họ tên hiển thị. Avatar tự động tạo từ chữ cái đầu tên.",
      highlightSelector: "input#full_name",
      clipSelector: "div.space-y-6.max-w-2xl.mx-auto > div:nth-child(2)",
      clipPadding: 20,
    });

    // ── 02: Card 2 — Đổi mật khẩu ────────────────────────────────────────
    await captureStep(page, {
      module: "09-tai-khoan",
      file: "02-doi-mat-khau",
      title: "Đổi mật khẩu",
      description:
        "Nhập mật khẩu hiện tại và mật khẩu mới (tối thiểu 8 ký tự). Xác nhận mật khẩu phải khớp.",
      highlightSelector: "input#current_password",
      clipSelector: "div.space-y-6.max-w-2xl.mx-auto > div:nth-child(3)",
      clipPadding: 20,
    });

    // ══════════════════════════════════════════════════════════════════════
    // PHÂN HỆ 9b: CÀI ĐẶT (/dashboard/settings)
    // 2 Card: Thông tin đơn vị | Chữ ký mặc định
    // ══════════════════════════════════════════════════════════════════════

    await page.goto("/dashboard/settings");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(500);

    // ── 03: Card 1 — Thông tin đơn vị ────────────────────────────────────
    await captureStep(page, {
      module: "09b-cai-dat",
      file: "01-thong-tin-don-vi",
      title: "Thông tin đơn vị",
      description:
        "Thiết lập tên cơ quan chủ quản, tên cơ quan ban hành, viết tắt (dùng trong số ký hiệu), và địa danh. Tự động điền vào văn bản khi soạn thảo.",
      highlightSelector: "input#ten_co_quan",
      clipSelector: "div.space-y-6.max-w-2xl.mx-auto > div:nth-child(2)",
      clipPadding: 20,
    });

    // ── 04: Card 2 — Chữ ký mặc định ─────────────────────────────────────
    await captureStep(page, {
      module: "09b-cai-dat",
      file: "02-chu-ky-mac-dinh",
      title: "Chữ ký mặc định",
      description:
        "Quyền hạn ký (TM./KT./TL./TUQ.), tên tập thể, chức vụ ký — tự động điền vào phần ký tên văn bản khi soạn thảo.",
      highlightSelector: "input#quyen_han",
      clipSelector: "div.space-y-6.max-w-2xl.mx-auto > div:nth-child(3)",
      clipPadding: 20,
    });
  });
});
