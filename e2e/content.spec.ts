/**
 * M4 gate (PLAN §12): profiles render with outbound network blocked. Every request the browser makes must be
 * same-origin (the web app, which proxies /api/v1). Photos come from our own API. Their credit is not printed under
 * the picture: the profile lists it under Sources, and /credits lists every photo's credit (D-055).
 * Desktop and 360px. The photo is a generated SYNTHETIC test pattern (CC0), not a real photograph.
 */
import { expect, type Locator, type Page, test } from '@playwright/test';

const ORIGIN = 'http://localhost:3110';

async function expectNoHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow, `horizontal overflow on ${page.url()}`).toBeLessThanOrEqual(0);
}

/** Aborts every request that leaves the web app's origin and records it. */
async function blockOutbound(page: Page) {
  const leaked: string[] = [];
  const images: string[] = [];
  await page.route('**/*', (route) => {
    const url = new URL(route.request().url());
    if (url.origin !== ORIGIN) {
      leaked.push(url.toString());
      return route.abort('blockedbyclient');
    }
    if (route.request().resourceType() === 'image') images.push(url.pathname);
    return route.continue();
  });
  return { leaked, images };
}

async function expectImageLoaded(page: Page | Locator, name: string) {
  const img = page.getByRole('img', { name });
  await expect(img.first()).toBeVisible();
  await expect.poll(() => img.first().evaluate((el: HTMLImageElement) => el.complete && el.naturalWidth > 0)).toBe(true);
}

const PHOTO_ALT = 'Generated test pattern standing in for a photograph (synthetic fixture)';
const CREDIT = 'Synthetic test pattern (generated, not a photograph), CC0';

test('a profile renders fully with outbound network blocked, with its photo, and its credit under Sources', async ({ page }) => {
  const { leaked, images } = await blockOutbound(page);
  await page.goto('/species/fictus-captivus');

  await expect(page.getByRole('heading', { level: 1, name: 'Captive example lizard (fixture)' })).toBeVisible();
  for (const h of ['How threatened is it?', 'How many remain?', 'Where does it live?', 'How do we know?']) {
    await expect(page.getByRole('heading', { name: h })).toBeVisible();
  }
  await expectImageLoaded(page, PHOTO_ALT);
  // No credit line under the photo (D-055); the Sources section lists it under "Photographs".
  await expect(page.locator('figure').first()).not.toContainText(CREDIT);
  const photographs = page.getByRole('heading', { level: 3, name: 'Photographs' });
  await expect(photographs).toBeVisible();
  await expect(photographs.locator('xpath=following-sibling::ul[1]')).toContainText(CREDIT);
  expect(images.length).toBeGreaterThan(0);
  expect(images.every((p) => p.startsWith('/api/v1/media/') && p.endsWith('.webp'))).toBe(true);
  expect(leaked).toEqual([]);
  await expectNoHorizontalOverflow(page);
});

test('every profile renders with outbound network blocked, with or without a photo', async ({ page }) => {
  const { leaked } = await blockOutbound(page);
  for (const slug of ['fictus-exemplaris', 'fictus-regionalis', 'fictus-marinus', 'fictus-generalis', 'fictus-occultus']) {
    await page.goto(`/species/${slug}`);
    await expect(page.getByRole('heading', { name: 'How do we know?' })).toBeVisible();
    await expect(page.getByRole('img', { name: 'No photograph available' })).toBeVisible();
    await expectNoHorizontalOverflow(page);
  }
  expect(leaked).toEqual([]);
});

test('the population key fact shows one estimate with its basis, context, place and year, or Unknown (D-059)', async ({ page }) => {
  const fact = page.getByTestId('population-fact');
  // Two estimates: the global wild one leads; the regional breeding-pairs one is one click away.
  await page.goto('/species/fictus-regionalis');
  await expect(fact).toContainText('20,000–49,999 mature individuals');
  await expect(fact).toContainText('Wild · Global · 2019');
  await expect(fact.getByRole('link', { name: 'and 1 more estimate' })).toHaveAttribute('href', '#population');
  // Wild before captive, even when the captive count comes with an exact figure.
  await page.goto('/species/fictus-captivus');
  await expect(fact).toContainText('50–249 mature individuals');
  await expect(fact).toContainText('Wild · Global · 2022');
  await expect(fact).not.toContainText('412');
  // A qualitative estimate is shown in words, and a missing year is said, not hidden.
  await page.goto('/species/fictus-marinus');
  await expect(fact).toContainText('Locally common on outer reefs (synthetic)');
  await expect(fact).toContainText('Wild · Global · date not stated');
  // No estimate: Unknown, never zero.
  await page.goto('/species/fictus-exemplaris');
  await expect(fact).toHaveText('Unknown');
  await expectNoHorizontalOverflow(page);
});

test('cards and the home hero show the photo without a credit line or caption, same-origin only', async ({ page }) => {
  const { leaked } = await blockOutbound(page);
  await page.goto('/');
  // The hero is the owner's header image (D-041), a same-origin file, with no caption over it (D-055).
  const hero = page.locator('figure').first();
  await expectImageLoaded(hero, 'Close-ups of eight animal faces side by side');
  await expect(hero).toHaveText('');
  await expect(page.getByText(/licence pending/i)).toHaveCount(0);
  // A catalogue photo on the home page has no credit line; /credits has it (D-055).
  const homeCard = page.getByRole('article').filter({ has: page.getByRole('img', { name: PHOTO_ALT }) }).first();
  await homeCard.scrollIntoViewIfNeeded(); // card photos load lazily, below the fold on phones
  await expectImageLoaded(homeCard, PHOTO_ALT);
  await expect(homeCard).not.toContainText(CREDIT);
  await expect(page.getByText(CREDIT)).toHaveCount(0);
  await expectNoHorizontalOverflow(page);

  await page.goto('/species');
  const card = page.getByRole('article').filter({ hasText: 'Captive example lizard (fixture)' });
  await expectImageLoaded(card, PHOTO_ALT);
  await expect(card).not.toContainText(CREDIT);
  await expect(page.getByText(/licence pending/i)).toHaveCount(0);
  await expect(page.getByRole('article').filter({ hasText: 'Example reef fish (fixture)' })).toContainText('No photo yet');
  await expectNoHorizontalOverflow(page);
  expect(leaked).toEqual([]);
});
