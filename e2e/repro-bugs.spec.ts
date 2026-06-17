import { test, expect } from "@playwright/test";

const DEMO_DOC_ID = "a1b2c3d4-0001-4e88-8ee4-ef1234567801";

async function login(page: any) {
  await page.goto("/login");
  await page.fill('input[type="email"]', "demo@civicai.vn");
  await page.fill('input[type="password"]', "Demo@2026");
  await page.click('button[type="submit"]');
  await page.waitForURL("**/dashboard**", { timeout: 15_000 });
}

test.describe("Bug repro", () => {
  test.setTimeout(120_000);

  // Bug #17/#25: TypeSelector sai khi chọn template 2 lần (stale key)
  test("Bug17-25: TypeSelector sai khi re-select template", async ({ page }) => {
    await login(page);

    // Mở doc mới với welcome panel
    await page.goto(`/dashboard/documents/${DEMO_DOC_ID}?new=true`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1500);

    // Chọn "Tờ trình" (TTr) lần 1
    await page.getByRole("button", { name: "Tờ trình" }).click();
    await page.waitForTimeout(1500);

    // Đọc TypeSelector sau lần 1
    const typeSelector1 = await page.locator('select').first().inputValue();
    console.log("TypeSelector after 1st select (expect TTr):", typeSelector1);

    // Đọc badge sau lần 1
    const badge1 = await page.locator("span.bg-teal-50.text-teal-700.border-teal-200").first().textContent().catch(() => "none");
    console.log("Badge after 1st select:", badge1);

    // Mở lại welcome panel
    await page.locator('button[title*="Thay đổi template"]').click();
    await page.waitForTimeout(500);

    // Chọn "Quyết định" (QĐ) lần 2
    await page.getByRole("button", { name: "Quyết định" }).click();
    await page.waitForTimeout(1500);

    // Đọc TypeSelector sau lần 2 (lỗi: sẽ vẫn là "TTr" nếu stale key)
    const typeSelector2 = await page.locator('select').first().inputValue();
    console.log("TypeSelector after 2nd select (expect QĐ, bug shows TTr):", typeSelector2);

    // Đọc badge sau lần 2
    const badge2 = await page.locator("span.bg-teal-50.text-teal-700.border-teal-200").first().textContent().catch(() => "none");
    console.log("Badge after 2nd select (expect QĐ):", badge2);

    // Gõ vào editor để trigger onChange
    const editorArea = page.locator(".ProseMirror").first();
    await editorArea.click();
    await page.keyboard.type("xyz");
    await page.waitForTimeout(800);

    // Badge sau typing
    const badge3 = await page.locator("span.bg-teal-50.text-teal-700.border-teal-200").first().textContent().catch(() => "none");
    console.log("Badge after typing (expect QĐ):", badge3);

    await page.screenshot({ path: "e2e/doc-screenshots/debug-template-badge.png" });

    // TypeSelector MUST show QĐ
    expect(typeSelector2).toBe("QĐ");
  });

  // Bug #15: Xem saved content của blank doc
  test("Bug15: blank doc minimal save content", async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on("console", msg => {
      if (msg.type() === "error") consoleErrors.push(msg.text());
    });
    page.on("pageerror", err => consoleErrors.push(`PAGE ERROR: ${err.message}`));

    await login(page);

    // Tạo document mới, không có content
    await page.goto("/dashboard/documents/new");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    // Tại đây đã redirect sang /dashboard/documents/[id]?new=true
    const currentUrl = page.url();
    console.log("Current URL after new doc:", currentUrl);

    // Chọn "Trang trắng" tab
    const blankTab = page.getByRole("button", { name: "Trang trắng" });
    if (await blankTab.count() > 0) {
      await blankTab.click();
      await page.waitForTimeout(500);

      // Click "Vào editor trống"
      const enterBtn = page.getByRole("button", { name: "Vào editor trống" });
      if (await enterBtn.count() > 0) {
        await enterBtn.click();
        await page.waitForTimeout(2000);
      }
    }

    console.log("After blank selection, console errors:", consoleErrors);

    // Bấm Xem trước
    const previewBtn = page.getByRole("button", { name: "Xem trước" });
    if (await previewBtn.count() > 0) {
      await previewBtn.click();
      await page.waitForTimeout(2000);
    }

    console.log("After preview, console errors:", consoleErrors);
    await page.screenshot({ path: "e2e/doc-screenshots/debug-blank-preview2.png" });

    // Kiểm tra không có lỗi JS nghiêm trọng
    const seriousErrors = consoleErrors.filter(e =>
      !e.includes("hydration") &&
      !e.includes("Warning") &&
      !e.includes("fetchNd30Constants")
    );
    console.log("Serious errors:", seriousErrors);
  });
});
