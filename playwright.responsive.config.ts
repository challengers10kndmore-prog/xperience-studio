import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  testMatch: /responsive\.spec\.ts/,
  timeout: 90_000,
  workers: process.env.CI ? 2 : 4,
  reporter: [["list"], ["json", { outputFile: "test-results/responsive.json" }]],
  use: { baseURL: "http://localhost:4173", trace: "off", browserName: "chromium" },
  webServer: { command: "npm run build && npx vite preview --port 4173 --strictPort", url: "http://localhost:4173", reuseExistingServer: true, timeout: 180_000 },
});
