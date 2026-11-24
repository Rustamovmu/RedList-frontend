/**
 * M2 gate (PLAN §12): search → filter → profile → add three species to compare → Back restores the filters,
 * on desktop and at 360px; compare renders Unknown and mixed units correctly; no horizontal overflow at 360px.
 * All species are SYNTHETIC fixtures (Fictus …).
 */
import { expect, type Page, test } from '@playwright/test';

async function expectNoHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow, `horizontal overflow on ${page.url()}`).toBeLessThanOrEqual(0);
}

const isMobile = (page: Page) => (page.viewportSize()?.width ?? 1280) < 768;

/** On mobile the filters live in a drawer. */
async function openFilters(page: Page) {
  if (isMobile(page)) await page.getByRole('button', { name: /^Filters/ }).click();
}
async function closeFilters(page: Page) {
  if (isMobile(page)) await page.getByRole('button', { name: 'Close' }).click();
}

async function addFromExplore(page: Page, name: string) {
  await page.getByRole('link', { name, exact: true }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(name);
  await expectNoHorizontalOverflow(page);
  await page.getByRole('button', { name: 'Add to compare' }).click();
  await expect(page.getByRole('button', { name: 'Remove from compare' })).toBeVisible();
}

test('search → filter → profile → compare three → Back restores the filters', async ({ page }) => {
  await page.goto('/');
  await expectNoHorizontalOverflow(page);
  await page.getByRole('searchbox', { name: 'Search species by name' }).fill('fictus');
  await page.getByRole('button', { name: 'Search', exact: true }).click();
  await expect(page).toHaveURL(/\/species\?q=fictus$/);
  await expect(page.getByRole('status')).toHaveText('6 species in this catalogue match');

  await openFilters(page);
  await page.getByRole('checkbox', { name: /^Land/ }).check();
  await page.getByRole('button', { name: 'Apply filters' }).click();
  await expect(page).toHaveURL(/environment=terrestrial/);
  await expect(page.getByRole('status')).toHaveText('5 species in this catalogue match');
  await expect(page.getByRole('link', { name: /Environment: Land/ })).toBeVisible(); // chip
  await expectNoHorizontalOverflow(page);
  const filteredUrl = page.url();

  await addFromExplore(page, 'Example beast (fixture)');
  await page.goBack();
  // Back restores the filtered list: URL, results and the checked box.
  await expect(page).toHaveURL(filteredUrl);
  await expect(page.getByRole('status')).toHaveText('5 species in this catalogue match');
  await openFilters(page);
  await expect(page.getByRole('checkbox', { name: /^Land/ })).toBeChecked();
  await closeFilters(page);

  await addFromExplore(page, 'Regional example bird (fixture)');
  await page.goBack();
  await expect(page).toHaveURL(filteredUrl);

  await addFromExplore(page, 'Hidden example frog (fixture)');
  await page.getByRole('link', { name: 'Compare (3 of 3)' }).click();

  await expect(page).toHaveURL(/\/compare\?species=fictus-exemplaris,fictus-regionalis,fictus-occultus$/);
  await expectNoHorizontalOverflow(page);
  const note = page.getByTestId('population-comparability').filter({ visible: true });
  await expect(note).toContainText('Not directly comparable');
  await expect(note).toContainText('Example beast (fixture)'); // its population is unknown
  await expect(page.getByText('Not assessed', { exact: true }).filter({ visible: true })).toBeVisible();
  await expect(page.getByText('Locations withheld to protect this species').filter({ visible: true })).toBeVisible();

  // Back from compare → the last profile → the filtered list, filters intact.
  await page.goBack();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Hidden example frog (fixture)');
  await page.goBack();
  await expect(page).toHaveURL(filteredUrl);
  await expect(page.getByRole('status')).toHaveText('5 species in this catalogue match');
});

test('compare holds at most three and says so', async ({ page }) => {
  for (const slug of ['fictus-exemplaris', 'fictus-regionalis', 'fictus-occultus']) {
    await page.goto(`/species/${slug}`);
    await page.getByRole('button', { name: 'Add to compare' }).click();
  }
  await page.goto('/species/fictus-captivus');
  await expect(page.getByRole('button', { name: 'Add to compare' })).toBeDisabled();
  await expect(page.getByText('Compare holds 3 species. Remove one first.')).toBeVisible();
});

test('compare shows mixed units as not directly comparable and unknown as Unknown, never as numbers combined', async ({ page }) => {
  await page.goto('/compare?species=fictus-regionalis,fictus-occultus');
  const note = page.getByTestId('population-comparability').filter({ visible: true });
  await expect(note).toContainText('Not directly comparable: the estimates use different units');
  await expect(note).toContainText('mature individuals');
  await expect(note).toContainText('individuals (all ages)');
  await expectNoHorizontalOverflow(page);

  await page.goto('/compare?species=fictus-exemplaris,fictus-marinus');
  await expect(page.getByTestId('population-comparability').filter({ visible: true })).toContainText('no wild, global, numeric estimate');
  await expect(page.getByText('Unknown', { exact: true }).filter({ visible: true }).first()).toBeVisible();
  await expect(page.getByText('Locally common on outer reefs (synthetic)').filter({ visible: true })).toBeVisible(); // qualitative stays words

  await page.goto('/compare?species=a,b,c,d');
  // (Next.js adds its own empty role=alert route announcer, so match by text.)
  await expect(page.getByRole('alert').filter({ hasText: 'Compare takes 1 to 3 species' })).toBeVisible();
});

test('explore has an empty state with reset, and chips remove one filter at a time', async ({ page }) => {
  await page.goto('/species?q=zzzzzz');
  await expect(page.getByText('No species match these filters.')).toBeVisible();
  await page.getByRole('link', { name: 'reset all filters' }).click();
  await expect(page).toHaveURL(/\/species$/);

  await page.goto('/species?group=bird&group=fish');
  await expect(page.getByRole('status')).toHaveText('2 species in this catalogue match');
  await page.getByRole('link', { name: /Animal group: Fish/ }).click();
  await expect(page).toHaveURL(/\/species\?group=bird$/);
  await expect(page.getByRole('status')).toHaveText('1 species in this catalogue match');
});

test('explore: the Apply bar never covers the filters on load, and is pinned below the ticked filter once one changes (D-059)', async ({ page }) => {
  test.skip(isMobile(page), 'the desktop sidebar only; in the phone drawer the bar is pinned from the start');
  await page.goto('/species');
  const bar = page.locator('.filter-apply');
  const position = () => bar.evaluate((el) => getComputedStyle(el).position);
  await expect.poll(position).toBe('static');
  const land = page.getByRole('checkbox', { name: /^Land/ });
  await land.check();
  await expect.poll(position).toBe('sticky');
  // The filter just ticked stays in view, above the pinned bar.
  await expect
    .poll(async () => {
      const [l, b] = await Promise.all([land.boundingBox(), bar.boundingBox()]);
      return l !== null && b !== null && l.y + l.height <= b.y;
    })
    .toBe(true);
});

test('no horizontal overflow on the core pages', async ({ page }) => {
  for (const path of ['/', '/species', '/species?sort=status', '/species/fictus-regionalis', '/species/fictus-occultus', '/compare?species=fictus-exemplaris,fictus-regionalis,fictus-captivus']) {
    await page.goto(path);
    await expectNoHorizontalOverflow(page);
  }
});
