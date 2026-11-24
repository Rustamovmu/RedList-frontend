/**
 * M3 gate (PLAN §12): the map with tile (basemap) requests blocked still has a working list; country-level data
 * is labelled; region pages, the support directory and the profile's geography and help sections.
 * Desktop and 360px. All species and organizations are SYNTHETIC fixtures.
 */
import { expect, type Page, test } from '@playwright/test';

async function expectNoHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow, `horizontal overflow on ${page.url()}`).toBeLessThanOrEqual(0);
}

const count = (page: Page) => page.getByTestId('map-count');

test('map with the basemap blocked: a notice, and the list and filters still work', async ({ page }) => {
  await page.route('**/api/v1/map/basemap**', (route) => route.abort());
  await page.goto('/map');

  await expect(page.getByText('The map could not be loaded.')).toBeVisible();
  await expect(count(page)).toHaveText('5 species in this catalogue match this view');
  await expect(page.getByRole('link', { name: 'Hidden example frog (fixture)' })).toHaveCount(0); // locations withheld
  // Every layer is labelled with its kind, in the legend and on each result.
  await expect(page.getByRole('list', { name: 'Map legend' })).toContainText('Country-level presence');
  await expect(page.getByRole('list', { name: 'Map legend' })).toContainText('Published range map');
  await expect(page.getByText('Shown on the map as: Country-level presence').first()).toBeVisible();
  await expect(page.getByText('Shown on the map as: Published range map').first()).toBeVisible();
  await expect(page.getByRole('button', { name: 'Near me' })).toBeDisabled();
  await expectNoHorizontalOverflow(page);

  await page.getByText('Filters', { exact: true }).click();
  await page.getByRole('checkbox', { name: 'Fish', exact: true }).check();
  await page.getByRole('button', { name: 'Apply filters' }).click();
  await expect(page).toHaveURL(/group=fish/);
  await expect(count(page)).toHaveText('1 species in this catalogue match this view');
  await expect(page.getByRole('link', { name: 'Example reef fish (fixture)' })).toBeVisible();
  await expect(page.getByText('The map could not be loaded.')).toBeVisible();
});

test('map loads with its own basemap, and a viewport in the URL narrows the list', async ({ page }) => {
  await page.goto('/map?bbox=0,55,20,72');
  await expect(count(page)).toHaveText('1 species in this catalogue match this view');
  await expect(page.getByRole('link', { name: 'Regional example bird (fixture)' })).toBeVisible();
  await expect(page.getByText('Shown on the map as: Country-level presence')).toBeVisible();
  await expect(page.locator('canvas.maplibregl-canvas')).toBeVisible({ timeout: 20_000 });
  await expect(page.getByText('The map could not be loaded.')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Near me' })).toBeEnabled();
  await expectNoHorizontalOverflow(page);
});

test('selecting a shaded place narrows the list to its species and links to its page; clearing brings the list back (D-060)', async ({ page }) => {
  // The view is centred on Tanzania (35° E, 6° S), where only the example beast is recorded. Madagascar's lizard is also in view.
  await page.goto('/map?bbox=25,-16,45,4');
  await expect(page.locator('canvas.maplibregl-canvas')).toBeVisible({ timeout: 20_000 });
  await expect(page.getByRole('link', { name: 'Captive example lizard (fixture)' })).toBeVisible();
  const map = page.getByTestId('map-canvas');
  await map.evaluate((el) => el.scrollIntoView({ block: 'center' }));
  const panel = page.getByTestId('map-selection');
  // The map may still be drawing its first frame, so click the centre until the selection shows.
  await expect(async () => {
    const box = await map.boundingBox();
    if (!box) throw new Error('no map');
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
    await expect(panel).toBeVisible({ timeout: 1_000 });
  }).toPass({ timeout: 20_000 });

  await expect(panel).toContainText('Country');
  await expect(panel).toContainText('Tanzania');
  await expect(panel.getByRole('link', { name: 'Open the page for Tanzania' })).toHaveAttribute('href', '/regions/tanzania');
  await expect(count(page)).toHaveText(/^1 of \d+ species in this view are recorded in Tanzania$/);
  await expect(page.getByRole('link', { name: 'Example beast (fixture)' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Captive example lizard (fixture)' })).toHaveCount(0);
  await expectNoHorizontalOverflow(page);

  await panel.getByRole('button', { name: /Clear the selection/ }).click();
  await expect(panel).toHaveCount(0);
  await expect(count(page)).toHaveText(/ species in this catalogue match this view$/);
  await expect(page.getByRole('link', { name: 'Captive example lizard (fixture)' })).toBeVisible();
});

test.describe('Near me', () => {
  test.use({ geolocation: { latitude: -1.29, longitude: 36.82 }, permissions: ['geolocation'] });
  test('finds the country in the browser and opens its region page', async ({ page }) => {
    await page.goto('/map');
    await expect(page.getByRole('button', { name: 'Near me' })).toBeEnabled({ timeout: 20_000 });
    await page.getByRole('button', { name: 'Near me' }).click();
    await expect(page).toHaveURL(/\/regions\/kenya$/);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Kenya');
  });
});

test('region pages list how species occur there and never list hidden species', async ({ page }) => {
  await page.goto('/regions/fiji');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Fiji');
  await expect(page.getByRole('link', { name: 'Example reef fish (fixture)' })).toBeVisible();
  await expect(page.getByText('Present · Native · Year-round')).toBeVisible();
  await expect(page.getByRole('link', { name: 'View on the map' })).toHaveAttribute('href', /\/map\?bbox=17\d(\.\d+)?,/);
  // Fiji has one species, so no filter could narrow the list and none is offered (D-059).
  await expect(page.getByText('Filters', { exact: true })).toHaveCount(0);
  await expectNoHorizontalOverflow(page);

  await page.goto('/regions/norway?seasonality=breeding');
  await expect(page.getByRole('link', { name: 'Regional example bird (fixture)' })).toBeVisible();
  await expect(page.getByText('Present · Native · Breeding season')).toBeVisible();
  // A selected filter always stays, so it can be unticked, even when it is the only choice (D-059).
  await expect(page.getByRole('group', { name: 'Season here' })).toBeVisible();
  await expect(page.getByRole('checkbox', { name: /^Breeding season/ })).toBeChecked();
  await expect(page.getByRole('group', { name: 'Origin here' })).toHaveCount(0);

  await page.goto('/regions/peru');
  await expect(page.getByText('No species in this catalogue are recorded in Peru yet.')).toBeVisible();
  await expect(page.getByText('Hidden example frog (fixture)')).toHaveCount(0);

  const missing = await page.goto('/regions/atlantis');
  expect(missing?.status()).toBe(404);
});

test('support directory and the profile help section show reviewed links with their destination', async ({ page }) => {
  await page.goto('/support');
  await expect(page.getByRole('heading', { name: 'How we review a link' })).toBeVisible();
  const link = page.getByRole('link', { name: 'Volunteer: Example Conservation Trust (fixture)' });
  await expect(link).toHaveAttribute('href', 'https://example.org/fictus-captivus/volunteer');
  await expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  await expect(page.getByText('(goes to example.org)')).toBeVisible();
  await expect(page.getByText(/disabled appeal/)).toHaveCount(0);
  await expectNoHorizontalOverflow(page);

  await page.goto('/species/fictus-captivus#help');
  await expect(page.getByRole('link', { name: 'Volunteer: Example Conservation Trust (fixture)' })).toBeVisible();
  await expect(page.getByRole('link', { name: /See the support directory/ })).toHaveAttribute('href', '/support');
});

test('profiles label range maps, generalized locations and country-level presence', async ({ page }) => {
  await page.goto('/species/fictus-marinus');
  await expect(page.getByText('Published range map: Present · Year-round')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Fiji' })).toHaveAttribute('href', '/regions/fiji');
  await expectNoHorizontalOverflow(page);

  await page.goto('/species/fictus-generalis');
  await expect(page.getByText('Generalized to whole countries or seas', { exact: true })).toBeVisible();

  await page.goto('/species/fictus-exemplaris');
  await expect(page.getByText(/No published range map/)).toBeVisible();
  await expect(page.getByText(/Country-level presence: the species is recorded somewhere/)).toBeVisible();
});
