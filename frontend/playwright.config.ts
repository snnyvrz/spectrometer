import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  retries: process.env.CI ? 2 : 0,
  reporter: "list",
  use: {
    baseURL: "http://127.0.0.1:3000",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: [
    {
      command:
        "uv run python -m uvicorn app.main:app --host 127.0.0.1 --port 8000",
      cwd: "../backend",
      reuseExistingServer: !process.env.CI,
      timeout: 120000,
      url: "http://127.0.0.1:8000/simulation/timestamps",
    },
    {
      command: "pnpm exec next dev --hostname 127.0.0.1 --port 3000",
      cwd: ".",
      env: {
        API_BASE_URL: "http://127.0.0.1:8000",
        NEXT_PUBLIC_WS_BASE_URL: "ws://127.0.0.1:8000",
      },
      reuseExistingServer: !process.env.CI,
      timeout: 120000,
      url: "http://127.0.0.1:3000",
    },
  ],
});
