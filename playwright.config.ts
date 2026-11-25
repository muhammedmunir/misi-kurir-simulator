import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "tests/contract/e2e",
  timeout: 90_000,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  use: {
    baseURL: "http://localhost:5180",
    trace: "on-first-retry",
  },
  webServer: {
    command: "npx vite --port 5180 --strictPort",
    url: "http://localhost:5180",
    reuseExistingServer: false,
    timeout: 60_000,
  },
  projects: [
    {
      name: "desktop-chrome",
      use: { ...devices["Desktop Chrome"], channel: "chrome" },
    },
    {
      name: "pixel-7",
      use: { ...devices["Pixel 7"], channel: "chrome" },
    },
  ],
});
