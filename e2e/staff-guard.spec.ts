/**
 * Staff area guard (DECISIONS D-065): without a valid staff session every staff page except set-password sends the
 * browser to the home page. Staff sign in on the form for everyone, /sign-in (D-066).
 * Runs against the throwaway wild_e2e database.
 */
import { expect, Page, test } from '@playwright/test';
import { E2E_ADMIN_EMAIL, E2E_ADMIN_PASSWORD } from './staff';

const GUARDED = ['/admin', '/admin/media', '/admin/support', '/admin/staff', '/admin/account', '/admin/species/1', '/admin/revisions/1'];

async function signIn(page: Page) {
  await page.goto('/sign-in');
  await page.getByLabel(/email/i).fill(E2E_ADMIN_EMAIL);
  await page.getByLabel(/password/i).fill(E2E_ADMIN_PASSWORD);
  await page.getByRole('button', { name: /sign in/i }).click();
  await expect(page).toHaveURL(/\/admin$/);
  await expect(page.getByRole('navigation', { name: 'Staff' })).toBeVisible();
}

test('no session cookie: the server redirects every staff page home', async ({ request }) => {
  for (const path of GUARDED) {
    const res = await request.get(path, { maxRedirects: 0 });
    expect(res.status(), path).toBe(307);
    expect(new URL(res.headers().location ?? '', 'http://x').pathname, path).toBe('/');
  }
});

test('sign-in and set-password stay open without a session', async ({ page }) => {
  await page.goto('/sign-in');
  await expect(page.getByRole('heading', { name: 'Sign in', level: 1 })).toBeVisible();
  await page.goto('/admin/set-password');
  await expect(page).toHaveURL(/\/admin\/set-password$/);
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
});

test('a session the API does not accept is sent home too', async ({ page, context, baseURL }) => {
  // Passes the server's cookie check; the staff layout asks the API, gets 401 and redirects.
  await context.addCookies([{ name: 'ww_session', value: 'not-a-real-session', url: baseURL ?? '' }]);
  await page.goto('/admin');
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole('navigation', { name: 'Staff' })).toHaveCount(0);
});

test('signed in: the sign-in page forwards to the staff area, and signing out goes home', async ({ page }) => {
  await signIn(page);
  await page.goto('/sign-in');
  await expect(page).toHaveURL(/\/admin$/);
  await page.getByRole('button', { name: 'Sign out' }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole('banner').getByRole('link', { name: 'Sign in' })).toBeVisible();
  await page.goto('/admin');
  await expect(page).toHaveURL(/\/$/);
});
