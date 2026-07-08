import { defineConfig, devices } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  testDir: './specs',
  outputDir: './test-results',
  timeout: 180_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : 1,
  reporter: [
    ['list'],
    ['html', { outputFolder: 'reports/html', open: 'never' }],
    ['json', { outputFile: 'reports/json/results.json' }],
    ['junit', { outputFile: 'reports/junit/results.xml' }],
  ],
  use: {
    screenshot: 'only-on-failure',
    trace: 'on-first-retry',
    video: 'retain-on-failure',
    actionTimeout: 15_000,
    navigationTimeout: 60_000,
  },
  metadata: {
    'kts-e2e': {
      project: 'Kurash Tournament Suite',
      version: '1.0.0',
      description: 'E2E automation framework for KTS desktop application',
    },
  },
  projects: [
    {
      name: 'electron',
      use: {
        launchOptions: {
          executablePath: process.env.KTS_EXECUTABLE_PATH ||
            path.resolve(__dirname, '../../electron-app/build-output/win-unpacked/Kurash Scoreboard.exe'),
        },
      },
    },
    {
      name: 'web',
      use: {
        ...devices['Desktop Chrome'],
        baseURL: process.env.KTS_BASE_URL || 'http://127.0.0.1:18000',
      },
    },
  ],
  // Run electron, smoke, and workflow tests by default.
  // Validation tests excluded — they target the old multi-exe architecture.
  // Run validation explicitly with: npm run test:validation
  grep: /@electron|@smoke|@workflow/,
});
