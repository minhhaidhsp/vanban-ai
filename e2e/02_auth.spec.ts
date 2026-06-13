import { test, expect } from "@playwright/test";
import { TEST_USER, screenshot } from "./helpers";

test.describe("PHẦN 2-3 — ĐĂNG KÝ / ĐĂNG NHẬP", () => {

  test("TC-04: Trang đăng ký layout 2 cột", async ({ page }) => {
    await page.goto("/register");
    // Panel trái teal
    await expect(page.getByText("CivicAI").first()).toBeVisible();
    await screenshot(page, "08_register_page");
  });

  test("TC-06: Đăng nhập thành công", async ({ page }) => {
    await page.goto("/login");
    await screenshot(page, "09_login_page");
    await page.fill('input[type="email"]', TEST_USER.email);
    await page.fill('input[type="password"]', TEST_USER.password);
    await page.click('button[type="submit"]');
    await page.waitForURL("**/dashboard**", { timeout: 15_000 });
    await screenshot(page, "10_after_login");
    // Cookie phải có
    const cookies = await page.context().cookies();
    const token = cookies.find((c) => c.name === "access_token");
    expect(token).toBeTruthy();
  });

  test("TC-07: Đăng nhập sai mật khẩu", async ({ page }) => {
    await page.goto("/login");
    await page.fill('input[type="email"]', "nonexistent_user@example.com");
    await page.fill('input[type="password"]', "wrongpassword");
    // Chờ API response để biết request đã được gửi đi và backend trả lời
    const [response] = await Promise.all([
      page.waitForResponse(
        (r) => r.url().includes("/auth/login"),
        { timeout: 15_000 }
      ),
      page.click('button[type="submit"]'),
    ]);
    // Backend phải từ chối — 401 Unauthorized hoặc 4xx
    expect(response.status()).toBeGreaterThanOrEqual(400);
    // Interceptor (window.location.href="/login") → page reload → vẫn ở /login
    await page.waitForLoadState("domcontentloaded", { timeout: 10_000 });
    expect(page.url()).not.toContain("/dashboard");
    await screenshot(page, "11_login_error");
  });
});
