/**
 * Staff accounts (PLAN §7, DECISIONS D-062): an admin invites someone, the one-time link is shown once, the
 * invitee sets a password in a separate browser and is signed in, and disabling the account ends that session.
 * Runs against the throwaway wild_e2e database; the invitee is a synthetic example.invalid address.
 */
import { expect, Page, test } from '@playwright/test';
import { E2E_ADMIN_EMAIL, E2E_ADMIN_PASSWORD } from './staff';

const INVITEE_PASSWORD = 'e2e-only invitee passphrase';

async function signIn(page: Page) {
  await page.goto('/admin');
  await page.getByLabel(/email/i).fill(E2E_ADMIN_EMAIL);
  await page.getByLabel(/password/i).fill(E2E_ADMIN_PASSWORD);
  await page.getByRole('button', { name: /sign in/i }).click();
  await expect(page.getByRole('navigation', { name: 'Staff' })).toBeVisible();
}

test('invite, set a password from the link, then disable the account', async ({ page, browser }, testInfo) => {
  test.setTimeout(120_000);
  const email = `e2e-invitee-${testInfo.project.name}@example.invalid`;
  const name = `Invitee ${testInfo.project.name}`;
  await signIn(page);

  await page.getByRole('navigation', { name: 'Staff' }).getByRole('link', { name: 'Staff' }).click();
  await expect(page.getByRole('heading', { name: 'Staff', level: 1 })).toBeVisible();
  const form = page.getByRole('form', { name: 'Invite someone' });
  await form.getByLabel('Name').fill(name);
  await form.getByLabel('Email').fill(email);
  await form.getByRole('button', { name: /Create account and link/i }).click();

  const panel = page.getByRole('region', { name: `Invite link for ${name}` });
  await expect(panel).toBeVisible();
  const link = await panel.getByRole('textbox').inputValue();
  expect(link).toMatch(/\/admin\/set-password#token=[A-Za-z0-9_-]{40,}$/);
  const row = page.locator('li', { hasText: email });
  await expect(row.getByText('Invited (no password yet)')).toBeVisible();

  // The invitee, in a browser with no cookies of its own.
  const other = await browser.newContext();
  const invitee = await other.newPage();
  await invitee.goto(link);
  await expect(invitee.getByRole('form', { name: 'Set up your staff account' })).toBeVisible(); // the link checked out
  expect(new URL(invitee.url()).hash).toBe(''); // the token is gone from the address bar
  await invitee.getByLabel('New password', { exact: true }).fill(INVITEE_PASSWORD);
  await invitee.getByLabel('New password again').fill(INVITEE_PASSWORD);
  await invitee.getByRole('button', { name: /Set password and sign in/i }).click();
  await expect(invitee.getByRole('heading', { name: 'You are signed in' })).toBeVisible();
  await invitee.getByRole('link', { name: /Go to the staff area/i }).click();
  await expect(invitee.getByRole('link', { name: `${name} (editor)` })).toBeVisible();
  // Editors do not see the Staff page in the navigation.
  await expect(invitee.getByRole('navigation', { name: 'Staff' }).getByRole('link', { name: 'Staff' })).toHaveCount(0);

  // The link works once.
  const again = await other.newPage();
  await again.goto(link);
  await expect(again.getByText(/This link is not valid any more/i)).toBeVisible();

  // Disable: the invitee's session ends at once.
  await page.getByRole('button', { name: 'I have passed it on' }).click();
  await page.reload();
  await expect(row.getByText('Active', { exact: true })).toBeVisible();
  page.once('dialog', (d) => d.accept());
  await row.getByRole('button', { name: 'Disable' }).click();
  await expect(row.getByText('Disabled', { exact: true })).toBeVisible();
  await invitee.goto('/admin');
  await expect(invitee.getByRole('heading', { name: 'Staff sign-in' })).toBeVisible();
  await other.close();
});
