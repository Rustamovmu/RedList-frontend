/**
 * Visitor accounts and the one sign-in form for everyone (owner request, DECISIONS D-066): "Sign in" at the top of
 * every page; a visitor who signs in or up stays on the site; staff go to the staff area.
 * Runs against the throwaway wild_e2e database; every address is a synthetic example.invalid one.
 */
import AxeBuilder from '@axe-core/playwright';
import { expect, Page, test } from '@playwright/test';
import { E2E_ADMIN_EMAIL, E2E_ADMIN_PASSWORD } from './staff';

const PASSWORD = 'e2e-only visitor passphrase';
const banner = (page: Page) => page.getByRole('banner');

async function fillSignIn(page: Page, email: string, password: string) {
  const form = page.getByRole('form', { name: 'Sign in' });
  await form.getByLabel('Email').fill(email);
  await form.getByLabel('Password').fill(password);
  await form.getByRole('button', { name: 'Sign in' }).click();
}

test('a visitor signs up from the header, stays on the site, signs out and signs back in', async ({ page }, testInfo) => {
  const email = `e2e-visitor-${testInfo.project.name}@example.invalid`;
  const name = `Visitor ${testInfo.project.name === 'desktop' ? 'Desk' : 'Phone'}`;

  await page.goto('/about');
  await banner(page).getByRole('link', { name: 'Sign in' }).click();
  await expect(page).toHaveURL(/\/sign-in\?next=%2Fabout$/);
  await page.getByRole('link', { name: 'Create one' }).click();
  await expect(page).toHaveURL(/\/sign-up\?next=%2Fabout$/);

  const form = page.getByRole('form', { name: 'Create an account' });
  await form.getByLabel('Name').fill(name);
  await form.getByLabel('Email').fill(email);
  await form.getByLabel('Password', { exact: true }).fill(PASSWORD);
  await form.getByLabel('Password again').fill(PASSWORD);
  await form.getByRole('button', { name: 'Create account' }).click();

  // Back where they started, signed in: the header shows their name instead of "Sign in".
  await expect(page).toHaveURL(/\/about$/);
  // The name shows from lg up; below that the link is a person icon, and the name is for screen readers.
  const accountLink = banner(page).getByRole('link', { name: new RegExp(`^${name}\\s*\\(your account\\)$`) });
  await expect(accountLink).toBeVisible();
  await expect(banner(page).getByRole('link', { name: 'Sign in' })).toHaveCount(0);
  await page.reload();
  await expect(accountLink).toBeVisible();

  // A visitor account is not a staff session.
  await page.goto('/admin');
  await expect(page).toHaveURL(/\/$/);

  await accountLink.click();
  await expect(page).toHaveURL(/\/account$/);
  await expect(page.getByText(email)).toBeVisible();
  await page.getByRole('button', { name: 'Sign out' }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(banner(page).getByRole('link', { name: 'Sign in' })).toBeVisible();

  // Signing in again: still a visitor, still on the public site.
  await banner(page).getByRole('link', { name: 'Sign in' }).click();
  await fillSignIn(page, email, PASSWORD);
  await expect(page).toHaveURL(/\/$/);
  await expect(accountLink).toBeVisible();
});

test('an admin signs in from the header and lands in the staff area', async ({ page }) => {
  await page.goto('/');
  await banner(page).getByRole('link', { name: 'Sign in' }).click();
  await fillSignIn(page, E2E_ADMIN_EMAIL, E2E_ADMIN_PASSWORD);
  await expect(page).toHaveURL(/\/admin$/);
  await expect(page.getByRole('navigation', { name: 'Staff' })).toBeVisible();
  await expect(banner(page).getByRole('link', { name: 'Staff area' })).toBeVisible();
});

test('a taken email and a wrong password are refused; a deleted account is gone', async ({ page }, testInfo) => {
  const email = `e2e-delete-${testInfo.project.name}@example.invalid`;
  await page.goto('/sign-up');
  const form = page.getByRole('form', { name: 'Create an account' });
  const signUp = async () => {
    await form.getByLabel('Name').fill('Short-lived visitor');
    await form.getByLabel('Email').fill(email);
    await form.getByLabel('Password', { exact: true }).fill(PASSWORD);
    await form.getByLabel('Password again').fill(PASSWORD);
    await form.getByRole('button', { name: 'Create account' }).click();
  };
  await signUp();
  await expect(page).toHaveURL(/\/$/);

  await page.goto('/account');
  const del = page.getByRole('form', { name: 'Delete your account' });
  await del.getByLabel('Password').fill('not the password');
  page.once('dialog', (d) => d.accept());
  await del.getByRole('button', { name: 'Delete my account' }).click();
  await expect(del.getByRole('alert')).toHaveText('Your password is incorrect');

  await del.getByLabel('Password').fill(PASSWORD);
  page.once('dialog', (d) => d.accept());
  await del.getByRole('button', { name: 'Delete my account' }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(banner(page).getByRole('link', { name: 'Sign in' })).toBeVisible();

  await page.goto('/sign-in');
  await fillSignIn(page, email, PASSWORD);
  await expect(page.getByRole('form', { name: 'Sign in' }).getByRole('alert')).toHaveText('Email or password is incorrect');

  // The staff address cannot be taken by a visitor.
  await page.goto('/sign-up');
  await form.getByLabel('Name').fill('Not staff');
  await form.getByLabel('Email').fill(E2E_ADMIN_EMAIL);
  await form.getByLabel('Password', { exact: true }).fill(PASSWORD);
  await form.getByLabel('Password again').fill(PASSWORD);
  await form.getByRole('button', { name: 'Create account' }).click();
  await expect(form.getByRole('alert')).toHaveText('An account with this email already exists');
});

test('signed in: the account page passes axe, and the header never overflows, even while comparing', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'one run is enough; it sets its own viewports');
  await page.goto('/sign-up');
  const form = page.getByRole('form', { name: 'Create an account' });
  await form.getByLabel('Name').fill('Axe visitor with a long name');
  await form.getByLabel('Email').fill('e2e-axe@example.invalid');
  await form.getByLabel('Password', { exact: true }).fill(PASSWORD);
  await form.getByLabel('Password again').fill(PASSWORD);
  await form.getByRole('button', { name: 'Create account' }).click();
  await expect(page).toHaveURL(/\/$/);
  await page.goto('/account');
  await expect(page.getByRole('heading', { name: 'Signed in' })).toBeVisible();
  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze();
  const serious = results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical').map((v) => `${v.id}: ${v.help}`);
  expect(serious).toEqual([]);

  // Two species picked, so the compare counter shares the header with the account link.
  await page.evaluate(() => localStorage.setItem('wildward:compare', JSON.stringify(['fictus-marinus', 'fictus-regionalis'])));
  const overflow: string[] = [];
  for (const width of [320, 360, 440, 768, 1024, 1280]) {
    await page.setViewportSize({ width, height: 800 });
    await page.goto('/about');
    await expect(banner(page).getByRole('link', { name: /your account/ })).toBeVisible();
    const extra = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    if (extra > 0) overflow.push(`${width}px: ${extra}px`);
  }
  expect(overflow).toEqual([]);
});
