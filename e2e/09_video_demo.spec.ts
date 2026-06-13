import { test, expect } from "@playwright/test";
import { TEST_USER, TEST_DOCS, screenshot } from "./helpers";

test("VIDEO DEMO — 7 cảnh toàn trình CivicAI", async ({ page }) => {
  // Cảnh 1: Landing page
  await page.goto("/");
  await page.waitForTimeout(1000);
  await screenshot(page, "video_01_landing");
  await page.evaluate(() =>
    window.scrollTo({ top: 400, behavior: "smooth" })
  );
  await page.waitForTimeout(800);
  await screenshot(page, "video_02_landing_stats");

  // Cảnh 2: Đăng nhập
  await page.goto("/login");
  await page.fill('input[type="email"]', TEST_USER.email);
  await page.fill('input[type="password"]', TEST_USER.password);
  await screenshot(page, "video_03_login_filled");
  await page.click('button[type="submit"]');
  await page.waitForURL("**/dashboard**", { timeout: 15_000 });

  // Cảnh 3: Dashboard
  await page.waitForTimeout(2000);
  await screenshot(page, "video_04_dashboard");

  // Cảnh 4: Soạn thảo AI — Modal tự tạo doc, không cần click type
  await page.goto("/dashboard/documents");
  await page.getByText("Soạn văn bản mới").click();
  await page.waitForURL("**/documents/*", { timeout: 15_000 });
  await page.waitForTimeout(1000);
  await page.getByText("Tạo bằng AI").click();
  await page.waitForTimeout(300);
  const textarea = page.locator("textarea").first();
  await textarea.fill(
    "Soạn công văn của UBND phường gửi các tổ dân phố " +
    "về vệ sinh môi trường trước Tết Nguyên đán."
  );
  await screenshot(page, "video_05_ai_form");
  // exact: true để tránh strict mode với <p>Chọn cách tạo văn bản phù hợp</p>
  await page.getByText("Tạo văn bản", { exact: true }).click();
  // Tăng timeout AI generation lên 120s
  await page.waitForSelector("text=AI đã tạo mẫu", { timeout: 120_000 });
  await screenshot(page, "video_06_ai_generated");

  // Cảnh 5: Rà soát — nút action là "Áp dụng" không phải "Chấp nhận"
  await page.goto(`/dashboard/documents/${TEST_DOCS.VB_LOI_01}`);
  await page.waitForTimeout(3000);
  await page.getByText("Rà soát").first().click();
  await page.waitForSelector("text=Áp dụng", { timeout: 60_000 });
  await screenshot(page, "video_07_rao_soat");
  await page.getByText("Áp dụng").first().click();
  await page.waitForTimeout(500);
  await screenshot(page, "video_08_rao_soat_accepted");

  // Cảnh 6: Tra cứu AI
  await page.goto("/dashboard/rag-search");
  await page.waitForTimeout(1000);
  const ragInput = page.locator("textarea").first();
  await ragInput.fill("Đăng ký khai tử thực hiện như thế nào?");
  // RAG search page dùng nút "Tìm kiếm" để submit (không phải Enter)
  await page.getByRole("button", { name: "Tìm kiếm" }).click();
  // Chờ kết quả — "Kết quả" heading xuất hiện khi AI xử lý xong
  await expect(
    page.getByText("Kết quả", { exact: true })
  ).toBeVisible({ timeout: 60_000 });
  await screenshot(page, "video_09_rag_result");

  // Cảnh 7: Chat widget công dân
  await page.goto("/");
  await page.waitForTimeout(1000);
  await page.locator("button").filter({
    has: page.locator("svg"),
  }).last().click();
  await page.waitForTimeout(500);
  const chatInput = page.locator("textarea, input[type=text]").last();
  await chatInput.fill("Đăng ký khai sinh cần những giấy tờ gì?");
  await chatInput.press("Enter");
  await page.waitForTimeout(15_000);
  await screenshot(page, "video_11_chat_widget_result");
});
