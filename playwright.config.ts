import { defineConfig } from "playwright/test";

export default defineConfig({
  testDir: "./tests",
  testMatch: "**/*.spec.ts",
  timeout: 60_000,
  retries: 1,
  use: {
    baseURL: "http://localhost:3000",
    headless: true,
    viewport: { width: 480, height: 960 },
    screenshot: "only-on-failure",
  },
  webServer: {
    command: "npm run dev",
    port: 3000,
    timeout: 30_000,
    reuseExistingServer: true,
  },
  projects: [
    {
      name: "mobile",
      use: { viewport: { width: 480, height: 960 } },
    },
  ],
});
