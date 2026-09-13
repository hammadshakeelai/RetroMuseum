import { defineConfig, devices } from "@playwright/test";

const base = process.env.BASE_PATH ?? "/RetroMuseum/";

export default defineConfig({
  testDir: "e2e",
  timeout: 5 * 60_000,
  use: { ...devices["Desktop Chrome"], baseURL: `http://localhost:4321${base}` },
  webServer: {
    command: "npm run preview",
    url: `http://localhost:4321${base}`,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
