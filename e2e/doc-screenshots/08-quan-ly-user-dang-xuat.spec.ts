import { test } from "@playwright/test";
import { captureStep, loginAs, TEST_ADMIN } from "./doc-helpers";

test.describe("Doc screenshots: Quản lý User & Đăng xuất", () => {
  test.setTimeout(60_000);

  test("Quản lý User & Đăng xuất", async ({ page }) => {

    await loginAs(page, TEST_ADMIN);

    // ══════════════════════════════════════════════════════════════════════
    // PHÂN HỆ 10: QUẢN LÝ USER (/dashboard/admin)
    // ══════════════════════════════════════════════════════════════════════

    await page.goto("/dashboard/admin");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(800);

    // ── 01: Bảng tổng quan user ───────────────────────────────────────────
    // Highlight role select của user đầu tiên KHÔNG phải admin hiện tại
    // (select.rounded-full:not(:disabled)) — nếu chỉ có 1 user thì null,
    // captureStep không lỗi (highlight silently skipped)
    await captureStep(page, {
      module: "10-quan-ly-user",
      file: "01-bang-user",
      title: "Quản lý người dùng",
      description:
        "Danh sách cán bộ trong hệ thống. Cột Phân quyền là dropdown native để đổi vai trò (admin/lãnh đạo/cán bộ) ngay trên bảng. Cột Trạng thái có thể toggle khóa/mở tài khoản.",
      highlightSelector: "select.rounded-full:not(:disabled)",
    });

    // ── 02: Zoom bảng — thấy rõ badge role + status + action buttons ─────
    await captureStep(page, {
      module: "10-quan-ly-user",
      file: "02-table-zoom",
      title: "Chi tiết bảng — vai trò & trạng thái",
      description:
        "Badge màu phân biệt vai trò: đỏ = Quản trị, tím = Lãnh đạo, xanh = Cán bộ. Có thể khóa tài khoản (toggle badge Hoạt động/Bị khóa) hoặc xóa user.",
      clipSelector: "div.border.rounded-xl.overflow-hidden.bg-white",
      clipPadding: 0,
    });

    // ══════════════════════════════════════════════════════════════════════
    // ĐĂNG XUẤT (sidebar, mọi trang dashboard)
    // ══════════════════════════════════════════════════════════════════════

    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(500);

    // ── 03: Highlight nút Đăng xuất ──────────────────────────────────────
    // button.w-full.gap-3 = Button variant=ghost trong sidebar
    // KHÔNG click — chỉ highlight để chụp, tránh end session
    await captureStep(page, {
      module: "10-quan-ly-user",
      file: "03-dang-xuat",
      title: "Đăng xuất",
      description:
        "Nhấn Đăng xuất ở cuối sidebar để kết thúc phiên làm việc và quay về trang đăng nhập.",
      highlightSelector: "button.w-full.gap-3",
    });
  });
});
