import { defineConfig } from '@playwright/test';

/**
 * Critical end-to-end suite (PLAN §12 M2 gate). Runs an isolated stack so it never touches your dev servers:
 *   API  on :4110 against the throwaway database wild_e2e (wiped and loaded with SYNTHETIC fixtures)
 *   web  on :3110, built into .next-e2e
 * Uses the installed Google Chrome (channel: 'chrome'), so no browser download is needed.
 *
 *   npm run test:e2e
 */
const API_PORT = 4110;
const WEB_PORT = 3110;
const WEB = `http://localhost:${WEB_PORT}`;
const SECRET = 'e2e-only-revalidate-secret-not-for-production';
const E2E_DB = process.env.E2E_DATABASE_URL ?? 'postgresql://wild:wild@localhost:5433/wild_e2e';

export default defineConfig({
  testDir: './e2e',
  workers: 1,
  fullyParallel: false,
  forbidOnly: true,
  retries: 0,
  reporter: [['list']],
  timeout: 60_000,
  use: { baseURL: WEB, channel: 'chrome', trace: 'retain-on-failure' },
  projects: [
    { name: 'desktop', use: { viewport: { width: 1280, height: 800 } } },
    { name: 'mobile-360', use: { viewport: { width: 360, height: 740 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 } },
  ],
  webServer: [
    {
      command: 'npm run e2e:api',
      cwd: '../RedList-backent',
      url: `http://localhost:${API_PORT}/api/v1/health/ready`,
      timeout: 180_000,
      reuseExistingServer: false,
      env: {
        DATABASE_URL: E2E_DB,
        PORT: String(API_PORT),
        WEB_ORIGIN: WEB,
        WEB_REVALIDATE_URL: `${WEB}/api/revalidate`,
        REVALIDATE_SECRET: SECRET,
        NODE_ENV: 'development',
      },
    },
    {
      command: `npx next build && npx next start -p ${WEB_PORT}`,
      url: WEB,
      timeout: 300_000,
      reuseExistingServer: false,
      env: { NEXT_DIST_DIR: '.next-e2e', API_INTERNAL_URL: `http://localhost:${API_PORT}`, REVALIDATE_SECRET: SECRET, NEXT_PUBLIC_SITE_URL: WEB },
    },
  ],
});
