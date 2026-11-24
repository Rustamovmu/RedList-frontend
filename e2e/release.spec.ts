/**
 * M5 release checks (PLAN §12): axe reports no serious or critical violations on the core pages, the core
 * journey works with the keyboard alone, and every page carries a nonce-based CSP with no violations.
 * Desktop and 360px. All species are SYNTHETIC fixtures.
 */
import AxeBuilder from '@axe-core/playwright';
import { expect, type Page, test } from '@playwright/test';

const CORE_PAGES = [
  '/',
  '/species',
  '/species?q=zzzzzz', // empty state
  '/species/fictus-captivus', // photo, support links, captive estimate
  '/species/fictus-exemplaris', // Unknown states
  '/species/fictus-marinus', // range map
  '/species/fictus-occultus', // withheld locations
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
  '/admin/set-password',
  '/no-such-page', // 404
];

/** Collects CSP violations reported in the page, so a blocked script or worker fails the test. */
async function watchCsp(page: Page): Promise<string[]> {
  const violations: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error' && /Content Security Policy/i.test(msg.text())) violations.push(msg.text());
  });
  await page.addInitScript(() => {
    document.addEventListener('securitypolicyviolation', (e) => console.error(`Content Security Policy: ${e.violatedDirective} ${e.blockedURI}`));
  });
  return violations;
}

test('axe: no serious or critical violations on the core pages', async ({ page }) => {
  test.setTimeout(180_000);
  const report: string[] = [];
  for (const path of CORE_PAGES) {
    await page.goto(path);
    await expect(page.locator('h1').first()).toBeVisible();
    if (path === '/map') await page.waitForLoadState('networkidle');
    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze();
    for (const v of results.violations) {
      if (v.impact === 'serious' || v.impact === 'critical') {
        report.push(`${path}: [${v.impact}] ${v.id} (${v.help}) at ${v.nodes.map((n) => n.target.join(' ')).slice(0, 3).join(' | ')}`);
      }
    }
  }
  expect(report, report.join('\n')).toEqual([]);
});

test('CSP: every page sends a nonce policy, framework scripts carry the nonce, and nothing is blocked', async ({ page }) => {
  test.setTimeout(120_000);
  const violations = await watchCsp(page);
  for (const path of ['/', '/species', '/species/fictus-marinus', '/compare?species=fictus-regionalis,fictus-occultus', '/map', '/about', '/admin']) {
    const res = await page.goto(path);
    const csp = res?.headers()['content-security-policy'] ?? '';
    expect(csp, path).toMatch(/script-src 'self' 'nonce-[A-Za-z0-9+/=]+' 'strict-dynamic'/);
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("object-src 'none'");
    expect(csp).not.toMatch(/script-src[^;]*'unsafe-inline'/);
    expect(csp).not.toContain('unsafe-eval'); // production build
    // Every executable script in the server HTML carries the request's nonce. JSON-LD blocks are data, and
    // chunks the runtime adds later are trusted through 'strict-dynamic'.
    const nonce = /'nonce-([^']+)'/.exec(csp)?.[1];
    const html = (await res?.text()) ?? '';
    const unNonced = [...html.matchAll(/<script\b[^>]*>/g)]
      .map((m) => m[0])
      .filter((tag) => !tag.includes('application/ld+json') && !tag.includes(`nonce="${nonce}"`));
    expect(unNonced, path).toEqual([]);
    if (path === '/map') {
      // MapLibre's blob worker and canvas run under the policy: the map draws, and no fallback notice appears.
      await expect(page.locator('canvas.maplibregl-canvas')).toBeVisible({ timeout: 20_000 });
      await page.waitForLoadState('networkidle');
      await expect(page.getByText('The map could not be loaded.')).toHaveCount(0);
    }
  }
  // The client app hydrated under the policy: a client-side control works.
  await page.goto('/species/fictus-captivus');
  await page.getByRole('button', { name: 'Add to compare' }).click();
  await expect(page.getByRole('button', { name: 'Remove from compare' })).toBeVisible();
  expect(violations).toEqual([]);
  const res = await page.request.get('/');
  expect(res.headers()['x-frame-options']).toBe('DENY');
  expect(res.headers()['x-content-type-options']).toBe('nosniff');
  expect(res.headers()['x-powered-by']).toBeUndefined();
});

/** Presses Tab until the focused element matches, failing after `max` presses. */
type Focused = { tag: string; text: string; name: string | null; value: string | null };
async function tabTo(page: Page, matches: (el: Focused) => boolean, max = 60) {
  for (let i = 0; i < max; i++) {
    await page.keyboard.press('Tab');
    const el = await page.evaluate(() => {
      const a = document.activeElement as HTMLElement | null;
      // textContent, not innerText: innerText applies CSS text-transform (the nav and buttons are uppercase).
      return { tag: a?.tagName ?? '', text: (a?.textContent ?? '').replace(/\s+/g, ' ').trim(), name: a?.getAttribute('name') ?? null, value: a?.getAttribute('value') ?? null };
    });
    if (matches(el)) return;
  }
  throw new Error('focus target not reached with Tab');
}

async function expectVisibleFocus(page: Page) {
  const outline = await page.evaluate(() => {
    const a = document.activeElement as HTMLElement;
    const s = getComputedStyle(a);
    return { style: s.outlineStyle, width: parseFloat(s.outlineWidth), shadow: s.boxShadow };
  });
  expect(outline.style !== 'none' && outline.width > 0 || outline.shadow !== 'none', 'focused element shows a focus indicator').toBe(true);
}

test('keyboard only: skip link → search → filter → profile → compare', async ({ page }) => {
  await page.goto('/');
  // The first Tab lands on the skip link, which moves focus past the header.
  await page.keyboard.press('Tab');
  const skip = page.getByRole('link', { name: 'Skip to content' });
  await expect(skip).toBeFocused();
  await expect(skip).toBeVisible();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/#main$/);

  // Main navigation is reachable in order.
  await page.goto('/');
  await tabTo(page, (el) => el.tag === 'A' && el.text === 'Explore');
  await expectVisibleFocus(page);

  // Search from the home page.
  await tabTo(page, (el) => el.tag === 'INPUT');
  await expect(page.getByRole('searchbox', { name: 'Search species by name' })).toBeFocused();
  await page.keyboard.type('fictus');
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/\/species\?q=fictus$/);
  await expect(page.getByRole('status')).toHaveText('6 species in this catalogue match');

  // Filters: on mobile they live in a drawer opened with the keyboard; Escape closes it and returns focus.
  const mobile = (page.viewportSize()?.width ?? 1280) < 768;
  if (mobile) {
    await tabTo(page, (el) => el.tag === 'BUTTON' && el.text.startsWith('Filters'));
    await page.keyboard.press('Enter');
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toBeHidden();
    await expect(page.getByRole('button', { name: /^Filters/ })).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('dialog')).toBeVisible();
  }
  await tabTo(page, (el) => el.tag === 'INPUT' && el.name === 'environment' && el.value === 'terrestrial');
  await page.keyboard.press('Space');
  await expect(page.getByRole('checkbox', { name: /^Land/ })).toBeChecked();
  await tabTo(page, (el) => el.tag === 'BUTTON' && el.text === 'Apply filters');
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/environment=terrestrial/);
  await expect(page.getByRole('status')).toHaveText('5 species in this catalogue match');

  // Open a profile and add it to compare.
  await tabTo(page, (el) => el.tag === 'A' && el.text.includes('Example beast (fixture)'), 120);
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Example beast (fixture)');
  await tabTo(page, (el) => el.tag === 'BUTTON' && el.text === 'Add to compare', 120);
  await expectVisibleFocus(page);
  await page.keyboard.press('Enter');
  await expect(page.getByRole('button', { name: 'Remove from compare' })).toBeVisible();

  // The compare link next to the button is the next stop.
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'Compare (1 of 3)' })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/\/compare\?species=fictus-/);
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expect(page.getByText('Example beast (fixture)').filter({ visible: true }).first()).toBeVisible();
});
