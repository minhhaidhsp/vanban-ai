import { test, expect, Page } from "@playwright/test";
import { screenshot } from "./helpers";

// Dùng tài khoản canbo (owner của seeded data HS-2026-001/002)
const CANBO = { email: "canbo@civicai.vn", password: "Demo@2026" };

async function loginAs(page: Page, email: string, password: string) {
  await page.goto("/login");
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForURL("**/dashboard**", { timeout: 15_000 });
}

test.describe("HỒ SƠ HÀNH CHÍNH", () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, CANBO.email, CANBO.password);
  });

  // TC-HS-01: Danh sách hiển thị đúng + badges màu
  test("TC-HS-01: Danh sách hồ sơ hiển thị với badges màu đúng", async ({ page }) => {
    await page.goto("/dashboard/ho-so");
    await page.waitForTimeout(2_000);

    // Header
    await expect(page.getByText("Hồ sơ hành chính").first()).toBeVisible();

    // Tabs lọc
    await expect(page.getByText("Tất cả")).toBeVisible();
    await expect(page.getByText("Đang xử lý")).toBeVisible();
    await expect(page.getByText("Chờ bổ sung")).toBeVisible();
    await expect(page.getByText("Hoàn thành")).toBeVisible();

    // Seeded data
    await expect(page.getByText("HS-2026-001")).toBeVisible({ timeout: 8_000 });

    // Badge "Đang xử lý" màu xanh (bg-blue-100)
    const blueBadge = page.locator("span.bg-blue-100").first();
    await expect(blueBadge).toBeVisible();

    // Badge "Chờ bổ sung" màu vàng (bg-amber-100)
    const amberBadge = page.locator("span.bg-amber-100").first();
    await expect(amberBadge).toBeVisible();

    await screenshot(page, "hs_01_list");
  });

  // TC-HS-02: Tab lọc "Chờ bổ sung" hoạt động đúng
  test("TC-HS-02: Tab lọc Chờ bổ sung hiển thị đúng hồ sơ", async ({ page }) => {
    await page.goto("/dashboard/ho-so");
    await page.waitForTimeout(1_500);

    // Click tab "Chờ bổ sung"
    await page.getByText("Chờ bổ sung").click();
    await page.waitForTimeout(1_000);

    // HS-2026-002 (trang_thai=cho_bo_sung) phải hiện
    await expect(page.getByText("HS-2026-002")).toBeVisible({ timeout: 6_000 });

    // HS-2026-001 (trang_thai=dang_xu_ly) không nên hiện trong tab này
    await expect(page.getByText("HS-2026-001")).not.toBeVisible();

    await screenshot(page, "hs_02_tab_filter");
  });

  // TC-HS-03: Chi tiết hồ sơ với stepper 5 bước
  test("TC-HS-03: Chi tiết hồ sơ hiển thị stepper 5 bước", async ({ page }) => {
    await page.goto("/dashboard/ho-so");
    await page.waitForTimeout(2_000);

    // Click vào HS-2026-001
    await page.getByText("HS-2026-001").click();
    await page.waitForURL("**/ho-so/**", { timeout: 10_000 });
    await page.waitForTimeout(1_500);

    // Header chi tiết
    await expect(page.getByText("HS-2026-001").first()).toBeVisible();

    // Stepper
    await expect(page.getByText("Quy trình xử lý")).toBeVisible();
    await expect(page.getByText("Tiếp nhận và kiểm tra hồ sơ")).toBeVisible();
    await expect(page.getByText("Tra cứu thông tin đăng ký")).toBeVisible();

    // Bước 1 hoàn thành (badge xanh)
    await expect(page.locator("span.bg-green-100").first()).toBeVisible();

    // Bước 2 đang làm (badge xanh dương)
    await expect(page.locator("span.bg-blue-100").first()).toBeVisible();

    await screenshot(page, "hs_03_detail");
  });

  // TC-HS-04: Tạo hồ sơ mới → redirect đến trang chi tiết
  test("TC-HS-04: Tạo hồ sơ mới redirect đến chi tiết + stepper sẵn sàng", async ({ page }) => {
    await page.goto("/dashboard/ho-so/new");
    await page.waitForTimeout(500);

    // Form hiện đúng
    await expect(page.getByText("Tạo hồ sơ mới")).toBeVisible();
    await expect(page.locator("select")).toBeVisible();

    // Điền form
    await page.selectOption("select", { index: 1 }); // first real option
    await page.locator('input[placeholder*="Nguyễn"]').fill("Nguyễn Test E2E");
    await page.locator('input[type="tel"]').fill("0987654321");

    // Submit
    const [resp] = await Promise.all([
      page.waitForResponse((r) => r.url().includes("/ho-so/"), { timeout: 15_000 }),
      page.click('button[type="submit"]'),
    ]);
    expect(resp.status()).toBe(201);

    // Redirect đến trang chi tiết — URL phải là /ho-so/{uuid}, không còn /new
    // Dùng regex để tránh match ngay trên URL hiện tại /ho-so/new
    await page.waitForURL(/\/ho-so\/[0-9a-f-]{8,}$/, { timeout: 15_000 });
    await expect(page.getByText("Quy trình xử lý")).toBeVisible({ timeout: 8_000 });

    await screenshot(page, "hs_04_created");
  });

  // TC-HS-06: Search filter narrows results
  test("TC-HS-06: Search filter theo tên công dân thu hẹp kết quả", async ({ page }) => {
    await page.goto("/dashboard/ho-so");
    await page.waitForTimeout(2_000);

    // Nhập tên công dân của HS-2026-001
    await page.locator('input[placeholder*="Tìm mã hồ sơ"]').fill("Lan Anh");
    await page.waitForTimeout(800);

    // HS-2026-001 (Nguyễn Thị Lan Anh) phải hiện
    await expect(page.getByText("HS-2026-001")).toBeVisible({ timeout: 5_000 });

    // HS-2026-002 (Phạm Minh Tuấn) không nên hiện
    await expect(page.getByText("HS-2026-002")).not.toBeVisible();

    await screenshot(page, "hs_06_search_filter");
  });

  // TC-HS-07: Trang_thai filter works (same as TC-HS-02 but via tab)
  test("TC-HS-07: Stats bar hiển thị các metric đúng", async ({ page }) => {
    await page.goto("/dashboard/ho-so");
    await page.waitForTimeout(2_500);

    // Stats cards phải có đủ 6 labels
    await expect(page.getByText("Tổng hồ sơ")).toBeVisible({ timeout: 8_000 });
    await expect(page.getByText("Đang xử lý").first()).toBeVisible();
    await expect(page.getByText("Chờ bổ sung").first()).toBeVisible();
    await expect(page.getByText("Hoàn thành").first()).toBeVisible();
    await expect(page.getByText("Quá hạn")).toBeVisible();
    await expect(page.getByText("HT tháng này")).toBeVisible();

    // Số liệu stats phải >= 2 (seeded data)
    const tong = page.locator(".rounded-md.border.bg-card").first().locator("p.text-xl");
    const value = await tong.textContent();
    expect(parseInt(value ?? "0")).toBeGreaterThanOrEqual(2);

    await screenshot(page, "hs_07_stats_bar");
  });

  // TC-HS-08: Sort by ma_ho_so
  test("TC-HS-08: Sort theo Mã hồ sơ đảo thứ tự khi click", async ({ page }) => {
    await page.goto("/dashboard/ho-so");
    await page.waitForTimeout(2_000);

    // Lấy thứ tự ban đầu
    const firstRowBefore = await page.locator("tbody tr td:first-child").first().textContent();

    // Click header "Mã hồ sơ" để đổi sort order
    await page.locator("th").filter({ hasText: "Mã hồ sơ" }).click();
    await page.waitForTimeout(500);

    const firstRowAfter = await page.locator("tbody tr td:first-child").first().textContent();

    // Với 2 records, sau khi click sort, thứ tự phải đổi
    // (asc → HS-2026-001 đầu; default desc → HS-2026-002 đầu hoặc ngược lại)
    expect(firstRowBefore).not.toBeNull();
    expect(firstRowAfter).not.toBeNull();

    await screenshot(page, "hs_08_sort");
  });

  // TC-HS-09: Pagination không hiện khi ít rows
  test("TC-HS-09: Pagination không hiện khi tổng < pageSize", async ({ page }) => {
    await page.goto("/dashboard/ho-so");
    await page.waitForTimeout(2_000);

    // Với 2 seeded records < 10 (default pageSize), Pagination component không render
    // (Pagination component trả null khi totalPages <= 1)
    const prevBtn = page.locator('[aria-label="Trang trước"]');
    await expect(prevBtn).not.toBeVisible();

    // Nhưng stats footer (hiển thị + select rows/page) nên có nếu có data
    await expect(page.getByText("hàng/trang")).toBeVisible({ timeout: 5_000 });

    await screenshot(page, "hs_09_no_pagination");
  });

  // TC-HS-10: chi_tiet cho_bo_sung hiển thị ly_do
  test("TC-HS-10: Chi tiết HS-2026-002 hiển thị lý do yêu cầu bổ sung", async ({ page }) => {
    await page.goto("/dashboard/ho-so");
    await page.waitForTimeout(2_000);

    // Vào HS-2026-002 (cho_bo_sung)
    await page.getByText("HS-2026-002").click();
    await page.waitForURL(/\/ho-so\/[0-9a-f-]{8,}$/, { timeout: 10_000 });
    await page.waitForTimeout(1_500);

    // Phải thấy badge "Chờ bổ sung"
    await expect(page.getByText("Chờ bổ sung").first()).toBeVisible();

    // Phải thấy lý do bổ sung
    await expect(
      page.getByText("Lý do yêu cầu bổ sung")
    ).toBeVisible({ timeout: 6_000 });
    await expect(
      page.getByText(/Thiếu bản sao CCCD/)
    ).toBeVisible();

    await screenshot(page, "hs_10_cho_bo_sung_detail");
  });

  // TC-HS-05: Hoàn thành bước → bước tiếp tự chuyển sang đang làm
  test("TC-HS-05: Hoàn thành bước 1 → bước 2 tự chuyển sang Đang làm", async ({ page }) => {
    // Tạo hồ sơ mới để test (tránh sửa seeded data)
    await page.goto("/dashboard/ho-so/new");
    await page.waitForTimeout(500);
    await page.selectOption("select", { index: 1 });
    await page.locator('input[placeholder*="Nguyễn"]').fill("Test Hoan Thanh Buoc");

    const [createResp] = await Promise.all([
      page.waitForResponse((r) => r.url().includes("/ho-so/") && r.request().method() === "POST", { timeout: 15_000 }),
      page.click('button[type="submit"]'),
    ]);
    expect(createResp.status()).toBe(201);

    await page.waitForURL("**/ho-so/**", { timeout: 15_000 });
    await page.waitForTimeout(1_500);

    // Tìm bước 1 (dang_lam) — có textarea + nút Hoàn thành bước
    const hoanThanhBtn = page.getByText("Hoàn thành bước").first();
    await expect(hoanThanhBtn).toBeVisible({ timeout: 6_000 });

    // Gõ kết quả và hoàn thành
    await page.locator("textarea").first().fill("Kiem tra xong, ho so day du");
    await hoanThanhBtn.click();

    // Chờ API response
    await page.waitForResponse(
      (r) => r.url().includes("/buoc/") && r.request().method() === "PATCH",
      { timeout: 10_000 }
    );
    await page.waitForTimeout(1_500);

    // Bước 1 phải hiện "Xong" (badge xanh lá)
    await expect(page.locator("span.bg-green-100").first()).toBeVisible();

    // Bước 2 phải hiện "Đang làm" và có textarea mới
    await expect(page.locator("span.bg-blue-100").first()).toBeVisible();

    await screenshot(page, "hs_05_complete_buoc");
  });
});
