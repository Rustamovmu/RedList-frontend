/**
 * R1 launch readiness: the automatable parts of the manual accessibility checklist
 * (backend docs/launch/A11Y_MANUAL_CHECK.md).
 *  - Reflow (WCAG 1.4.10) and 200% zoom (1.4.4): no horizontal scrolling at 320 CSS px wide, which is what a
 *    1280 px window shows at 400% zoom, nor at 640 px, which is 200%.
 *  - Structure that screen-reader users navigate by: one main landmark, one h1, no skipped heading levels,
 *    all content inside landmarks (axe best-practice rules, which the WCAG-tag run in release.spec.ts leaves out).
 *  - Staff pages: signed in with the e2e-only admin, axe finds no serious or critical violations, and sign-in
 *    works from the keyboard.
 * Viewports are set inside the tests, so they run once, in the desktop project. All species are SYNTHETIC.
 */
import AxeBuilder from '@axe-core/playwright';
import { expect, type Page, test } from '@playwright/test';
import { E2E_ADMIN_EMAIL, E2E_ADMIN_PASSWORD } from './staff';

const PAGES = [
  '/',
  '/species',
  '/species/fictus-captivus',
  '/species/fictus-exemplaris',
  '/species/fictus-marinus',
  '/compare?species=fictus-regionalis,fictus-occultus,fictus-exemplaris',
  '/map',
  '/regions/norway',
  '/support',
  '/about',
  '/methodology',
  '/sources',
  '/credits',
  '/privacy',
  '/terms',
  '/admin',
];

const STRUCTURE_RULES = ['landmark-one-main', 'page-has-heading-one', 'heading-order', 'region', 'landmark-unique', 'bypass'];

test.beforeEach(({ isMobile }) => {
  test.skip(isMobile, 'viewports are set inside the tests; run once, in the desktop project');
});

async function overflowAt(page: Page, path: string, width: number, height: number) {
  await page.setViewportSize({ width, height });
  await page.goto(path);
  await expect(page.locator('h1').first()).toBeVisible();
  if (path === '/map') await page.waitForLoadState('networkidle');
  return page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
}

test('reflow: no horizontal scrolling at 320 px (400% zoom) or 640 px (200% zoom)', async ({ page }) => {
  test.setTimeout(180_000);
  const problems: string[] = [];
  for (const path of PAGES) {
    for (const [w, h] of [[320, 640], [640, 400]] as const) {
      const over = await overflowAt(page, path, w, h);
      if (over > 0) problems.push(`${path} at ${w}px: ${over}px of horizontal overflow`);
    }
  }
  expect(problems, problems.join('\n')).toEqual([]);
});

test('structure: one main, one h1, heading levels in order, content inside landmarks', async ({ page }) => {
  test.setTimeout(180_000);
  const report: string[] = [];
  for (const path of PAGES) {
    await page.goto(path);
    await expect(page.locator('h1').first()).toBeVisible();
    if (path === '/map') await page.waitForLoadState('networkidle');
    const results = await new AxeBuilder({ page }).withRules(STRUCTURE_RULES).analyze();
    for (const v of results.violations) report.push(`${path}: ${v.id} (${v.help}) at ${v.nodes.map((n) => n.target.join(' ')).slice(0, 3).join(' | ')}`);
  }
  expect(report, report.join('\n')).toEqual([]);
});

test('staff pages: keyboard sign-in, then no serious or critical axe violations', async ({ page }) => {
  test.setTimeout(180_000);
  await page.goto('/admin');
  await expect(page.getByRole('heading', { name: 'Staff sign-in' })).toBeVisible();
  // Keyboard only: focus the email field, type, Tab to the password, Enter submits.
  await page.getByLabel(/email/i).focus();
  await page.keyboard.type(E2E_ADMIN_EMAIL);
  await page.keyboard.press('Tab');
  await expect(page.getByLabel(/password/i)).toBeFocused();
  await page.keyboard.type(E2E_ADMIN_PASSWORD);
  await page.keyboard.press('Enter');
  const staffNav = page.getByRole('navigation', { name: 'Staff' });
  await expect(staffNav).toBeVisible();

  const report: string[] = [];
  const check = async (label: string) => {
    await expect(page.locator('h1').first()).toBeVisible();
    await page.waitForLoadState('networkidle');
    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze();
    for (const v of results.violations) {
      if (v.impact === 'serious' || v.impact === 'critical') {
        report.push(`${label}: [${v.impact}] ${v.id} (${v.help}) at ${v.nodes.map((n) => n.target.join(' ')).slice(0, 3).join(' | ')}`);
      }
    }
  };

  await check('/admin (species list)');
  await page.locator('a[href^="/admin/species/"]').first().click();
  await expect(page).toHaveURL(/\/admin\/species\//);
  await check('/admin/species/[id]');
  await page.locator('a[href^="/admin/revisions/"]').first().click();
  await expect(page).toHaveURL(/\/admin\/revisions\//);
  await check('/admin/revisions/[id] (editor)');
  await staffNav.getByRole('link', { name: 'Media' }).click();
  await expect(page).toHaveURL(/\/admin\/media/);
  await check('/admin/media');
  await staffNav.getByRole('link', { name: 'Support directory' }).click();
  await expect(page).toHaveURL(/\/admin\/support/);
  await check('/admin/support');
  expect(report, report.join('\n')).toEqual([]);
});
