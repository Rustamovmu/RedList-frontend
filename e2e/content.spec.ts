/**
 * M4 gate (PLAN §12): profiles render with outbound network blocked. Every request the browser makes must be
 * same-origin (the web app, which proxies /api/v1). Photos come from our own API with their credit shown.
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

test('a profile renders fully with outbound network blocked, with its photo and credit', async ({ page }) => {
  const { leaked, images } = await blockOutbound(page);
  await page.goto('/species/fictus-captivus');

  await expect(page.getByRole('heading', { level: 1, name: 'Captive example lizard (fixture)' })).toBeVisible();
  for (const h of ['How threatened is it?', 'How many remain?', 'Where does it live?', 'How do we know?']) {
    await expect(page.getByRole('heading', { name: h })).toBeVisible();
  }
  await expectImageLoaded(page, PHOTO_ALT);
  await expect(page.locator('figcaption').first()).toContainText(CREDIT);
  await expect(page.getByRole('link', { name: 'CC0' }).first()).toHaveAttribute('rel', /noopener noreferrer/);
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

test('cards and the home hero show the photo with its credit, same-origin only', async ({ page }) => {
  const { leaked } = await blockOutbound(page);
  await page.goto('/');
  // The hero is the owner's header image (D-041), a same-origin file whose credit is still pending, and says so.
  const hero = page.locator('figure').first();
  await expectImageLoaded(hero, 'Close-ups of eight animal faces side by side');
  await expect(hero).toContainText('Header image: credit and licence pending');
  // A catalogue photo on the home page carries its credit.
  const homeCard = page.getByRole('article').filter({ has: page.getByRole('img', { name: PHOTO_ALT }) }).first();
  await homeCard.scrollIntoViewIfNeeded(); // card photos load lazily, below the fold on phones
  await expectImageLoaded(homeCard, PHOTO_ALT);
  await expect(homeCard).toContainText(CREDIT);
  await expectNoHorizontalOverflow(page);

  await page.goto('/species');
  const card = page.getByRole('article').filter({ hasText: 'Captive example lizard (fixture)' });
  await expectImageLoaded(card, PHOTO_ALT);
  await expect(card).toContainText(CREDIT);
  await expect(page.getByRole('article').filter({ hasText: 'Example reef fish (fixture)' })).toContainText('No photo yet');
  await expectNoHorizontalOverflow(page);
  expect(leaked).toEqual([]);
});
