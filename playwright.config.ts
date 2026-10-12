import { defineConfig, devices } from "@playwright/test";

/**
 * E2E + visual-regression config. Playwright starts its own Vite dev server on a
 * dedicated port (so it never clashes with a dev server you already have open)
 * and drives the real app — the MSW mock IS the backend, exactly as in prod.
 */
export default defineConfig({
  testDir: "./e2e",
  // Single worker: the gameplay spec runs a real WebGL (PixiJS) context, and the
  // headless software renderer gets starved — and the page crashes — when another
  // worker competes for CPU in parallel. Serial keeps the run deterministic; the
  // suite is small, so the cost is minor.
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: [["list"], ["html", { open: "never" }]],
  // The app renders only after the MSW service worker registers (main.tsx awaits
  // it before the first paint), and SW registration time varies on a cold load.
  // Generous action/expect timeouts absorb that jitter; a genuinely broken app
  // still fails at the limit.
  expect: { timeout: 15_000 },
  use: {
    baseURL: "http://localhost:5180",
    viewport: { width: 1280, height: 720 },
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "npm run dev -- --port 5180 --strictPort",
    url: "http://localhost:5180",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
