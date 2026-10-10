import { defineConfig, devices } from "@playwright/test";

const PORT = Number(process.env.E2E_PORT ?? 3000);

// One phone-sized Chromium with a fake camera, so the live ghost-overlay path
// really runs. localhost counts as a secure context for getUserMedia.
export default defineConfig({
  testDir: "e2e",
  fullyParallel: false,
  workers: 1, // the specs share data/rentals.json
  retries: process.env.CI ? 1 : 0,
  globalSetup: "./e2e/global-setup.ts",
  globalTeardown: "./e2e/global-teardown.ts",
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "phone",
      use: {
        ...devices["Pixel 7"],
        permissions: ["camera"],
        launchOptions: { args: ["--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream"] },
      },
    },
  ],
  // Next 16 allows only one `next dev` per project, so reuse a running one.
  webServer: {
    command: `npm run dev -- --port ${PORT}`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
