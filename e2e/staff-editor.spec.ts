/**
 * The staff form editor (owner request, DECISIONS D-057): the published photo shows in the staff lists, the
 * written sections, diet tags and photos are edited in a form rather than as JSON, a missing provider
 * identifier is advice instead of a blocker, and a photo cannot be saved without alt text.
 * Runs against the throwaway wild_e2e database, whose fixtures are clearly synthetic taxa.
 */
import { expect, Page, test } from '@playwright/test';
import { E2E_ADMIN_EMAIL, E2E_ADMIN_PASSWORD } from './staff';

async function signIn(page: Page) {
  await page.goto('/sign-in');
  await page.getByLabel(/email/i).fill(E2E_ADMIN_EMAIL);
  await page.getByLabel(/password/i).fill(E2E_ADMIN_PASSWORD);
  await page.getByRole('button', { name: /sign in/i }).click();
  await expect(page.getByRole('navigation', { name: 'Staff' })).toBeVisible();
}

test('staff lists show the published photo, and the species page lists it with its credit', async ({ page }) => {
  await signIn(page);

  // The species list: a thumbnail of the live photo, served through the staff preview route.
  const thumbs = page.locator('ul img[src*="/api/v1/staff/media/"]');
  await expect(thumbs.first()).toBeVisible();
  expect(await thumbs.first().evaluate((img: HTMLImageElement) => img.naturalWidth)).toBeGreaterThan(0);

  // A published species with a photo: its own alt text and the credit recorded at publication.
  await page.goto('/admin');
  const withPhoto = page.locator('li', { has: page.locator('img[src*="/api/v1/staff/media/"]') }).first();
  await withPhoto.getByRole('link').first().click();
  await expect(page).toHaveURL(/\/admin\/species\//);
  await expect(page.getByRole('heading', { name: 'Photos on the live version' })).toBeVisible();
  await expect(page.getByText('Main photo')).toBeVisible();
  await expect(page.getByText(/synthetic/i).first()).toBeVisible();
});

test('the form edits text, tags and photos, and publishing is not blocked by a missing identifier', async ({ page }, testInfo) => {
  test.setTimeout(120_000);
  const slug = `fictus-formeditor-${testInfo.project.name}`;
  await signIn(page);

  // A new species, which deliberately has no provider identifier.
  await page.getByLabel(/Accepted scientific name/i).fill('Fictus formeditor');
  await page.getByLabel(/URL slug/i).fill(slug);
  await page.getByLabel(/Animal group/i).selectOption('amphibian');
  await page.getByRole('button', { name: /Create species and draft/i }).click();
  await expect(page).toHaveURL(/\/admin\/revisions\//);

  // The checklist asks for an identifier but says it does not block.
  const identifier = page.locator('li', { hasText: /provider identifier/ });
  await expect(identifier).toContainText('recommended, does not block');

  // Text and a tag, through the form instead of JSON.
  await page.getByLabel(/^Overview/).fill('A synthetic amphibian used to test the staff form editor.');
  await page.getByLabel(/Diet tags/).fill('insects');
  await page.getByRole('button', { name: 'Add tag' }).click();
  await expect(page.getByRole('button', { name: 'Remove tag insects' })).toBeVisible();
  // With no assessment and no estimate, the two explicit "we have nothing" switches are what the checklist wants.
  await page.getByLabel(/Not assessed/).check();
  await page.getByLabel(/Population unknown/).check();

  // A photo from the approved images, with alt text.
  await page.getByRole('button', { name: 'Add a photo' }).click();
  await page.getByRole('button', { name: 'Use this photo' }).first().click();
  const alt = page.getByLabel(/Alt text/);
  await expect(alt).toBeVisible();

  // Saving without alt text is refused before anything is sent.
  await page.getByRole('button', { name: 'Save draft' }).click();
  await expect(page.getByText(/has no alt text/i)).toBeVisible();

  await alt.fill('Generated test pattern standing in for a photograph of a synthetic amphibian');
  await page.getByRole('button', { name: 'Save draft' }).click();
  await expect(page.getByText('Draft saved.')).toBeVisible();

  // Everything round-trips through the API: reload and read the form again.
  await page.reload();
  await expect(page.getByLabel(/^Overview/)).toHaveValue(/synthetic amphibian used to test/);
  await expect(page.getByRole('button', { name: 'Remove tag insects' })).toBeVisible();
  await expect(page.getByLabel(/Alt text/)).toHaveValue(/Generated test pattern/);
  await expect(page.getByLabel(/Population unknown/)).toBeChecked();
  await expect(page.getByLabel(/Not assessed/)).toBeChecked();
  await expect(page.locator('ol img[src*="/api/v1/staff/media/"]').first()).toBeVisible();

  // The only thing left is the overview citation, which the JSON section still handles. The identifier
  // never appears as a blocker: with a citation added, submit is enabled.
  await expect(page.locator('li', { hasText: /An overview with at least one citation/ })).toContainText('An overview');
  const sourceId = await page.locator('section[aria-labelledby="src-h"] code').first().innerText();
  await page.locator('details summary').click();
  const json = page.getByLabel('Revision content as JSON');
  const current = JSON.parse(await json.inputValue());
  current.citations = [{ sectionKey: 'overview', sourceId: sourceId.trim(), locator: null, note: null }];
  await json.fill(JSON.stringify(current, null, 2));
  await page.getByRole('button', { name: 'Apply this JSON to the form' }).click();
  await page.getByRole('button', { name: 'Save draft' }).click();
  await expect(page.getByText('Draft saved.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Submit for review' })).toBeEnabled();
});
