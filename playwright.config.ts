import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  retries: 1,
  workers: 1,
  reporter: [
    ["html", { outputFolder: "playwright-report", open: "never" }],
    ["list"],
  ],
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
    screenshot: "on",
    video: "on",
    locale: "vi-VN",
    viewport: { width: 1440, height: 900 },
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "headed-video",
      use: {
        ...devices["Desktop Chrome"],
        headless: false,
        slowMo: 500,
        viewport: { width: 1920, height: 1080 },
        video: "off",        // tắt video Playwright
        screenshot: "off",   // tắt screenshot auto
      },
    },
    {
      name: "video-demo",
      use: {
        ...devices["Desktop Chrome"],
        headless: false,
        slowMo: 300,
        viewport: { width: 1920, height: 1080 },
        video: "on",
        screenshot: "off",
      },
    },
  ],
  outputDir: "test-results",
});
