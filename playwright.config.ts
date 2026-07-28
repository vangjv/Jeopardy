import { defineConfig, devices } from '@playwright/test';

process.env['PLAYWRIGHT_BROWSERS_PATH'] ??= '0';

const isCI = Boolean(process.env['CI']);

export default defineConfig({
  testDir: './e2e',
  outputDir: 'test-results',
  fullyParallel: false,
  workers: 1,
  retries: isCI ? 1 : 0,
  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
  ],
  expect: {
    timeout: 10_000,
    toHaveScreenshot: {
      animations: 'disabled',
      maxDiffPixelRatio: 0.005,
    },
  },
  use: {
    ...devices['Desktop Chrome'],
    baseURL: process.env['PLAYWRIGHT_BASE_URL'] ?? 'http://127.0.0.1:4200',
    viewport: { width: 1920, height: 1080 },
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      testIgnore: /full-episode\.spec\.ts/,
    },
    {
      name: 'receipt',
      testMatch: /full-episode\.spec\.ts/,
      use: {
        screenshot: 'on',
        video: {
          mode: 'on',
          size: { width: 1280, height: 720 },
        },
        trace: 'on',
      },
    },
  ],
});
