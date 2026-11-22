/**
 * Information pages and SEO (PLAN §4 "Other pages", "SEO"). Desktop and 360px.
 * All species are SYNTHETIC fixtures.
 */
import { expect, type Page, test } from '@playwright/test';

async function expectNoHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow, `horizontal overflow on ${page.url()}`).toBeLessThanOrEqual(0);
}

const PAGES: Array<[string, string]> = [
  ['/about', 'About Wildward'],
  ['/methodology', 'How we source facts'],
  ['/sources', 'Sources'],
  ['/credits', 'Photo credits'],
  ['/privacy', 'Privacy'],
  ['/terms', 'Terms of use'],
];

test('information pages render with one h1, a canonical URL, and no overflow; footer and nav links reach them', async ({ page }) => {
  for (const [path, h1] of PAGES) {
    const res = await page.goto(path);
    expect(res?.status(), path).toBe(200);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(h1);
    await expect(page.locator('h1')).toHaveCount(1);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', new RegExp(`${path}$`));
    await expectNoHorizontalOverflow(page);
  }
  await page.goto('/');
  await page.getByRole('contentinfo').getByRole('link', { name: 'Methodology' }).click();
  await expect(page).toHaveURL(/\/methodology$/);
});

test('the sources page lists cited sources with the species that cite them', async ({ page }) => {
  await page.goto('/sources');
  const fixture = page.getByRole('listitem').filter({ hasText: 'SYNTHETIC fixture source' });
  await expect(fixture).toContainText('Cited by:');
  await expect(fixture.getByRole('link', { name: 'Captive example lizard (fixture)' })).toHaveAttribute('href', '/species/fictus-captivus');
  await expect(page.getByText('Used for country, sea and ocean boundaries').first()).toBeVisible();
});

test('the Wildward logo, in the header or the footer, leads to the home hero, also from the home page itself (D-056)', async ({ page }) => {
  const toBottom = () => page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  const scrollY = () => page.evaluate(() => window.scrollY);
  const headerLogo = page.getByRole('banner').getByRole('link', { name: 'Wildward', exact: true });
  const footerLogo = page.getByRole('contentinfo').getByRole('link', { name: 'Wildward', exact: true });

  await page.goto('/');
  for (const logo of [footerLogo, headerLogo]) {
    await toBottom();
    await expect.poll(scrollY).toBeGreaterThan(0);
    await logo.click();
    await expect.poll(scrollY, { timeout: 5000 }).toBe(0);
    await expect(page).toHaveURL(/\/$/);
    await expect(headerLogo).toBeFocused();
  }

  await page.goto('/species');
  await toBottom();
  await footerLogo.click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole('heading', { level: 1 })).toBeInViewport();
});

test('the photo credits page gives each photo its creator, licence deed and species, linked from the footer (D-055)', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('contentinfo').getByRole('link', { name: 'Photo credits' }).click();
  await expect(page).toHaveURL(/\/credits$/);
  const lizard = page.getByRole('listitem').filter({ has: page.getByRole('link', { name: 'Captive example lizard (fixture)' }) });
  await expect(lizard).toContainText('Synthetic test pattern (generated, not a photograph), CC0');
  await expect(lizard.getByRole('link', { name: 'CC0' })).toHaveAttribute('href', 'https://creativecommons.org/publicdomain/zero/1.0/');
  await expect(lizard.getByRole('link', { name: 'CC0' })).toHaveAttribute('rel', /noopener noreferrer/);
  // Species without a photo are not listed.
  await expect(page.getByRole('link', { name: 'Example reef fish (fixture)' })).toHaveCount(0);
});

test('sitemap.xml lists published species and regions only; robots.txt keeps staff and API out', async ({ request }) => {
  const sitemap = await (await request.get('/sitemap.xml')).text();
  expect(sitemap).toContain('/species/fictus-captivus</loc>');
  expect(sitemap).toContain('/methodology</loc>');
  expect(sitemap).toContain('/credits</loc>');
  expect(sitemap).toContain('/regions/kenya</loc>');
  expect(sitemap).not.toContain('/regions/peru</loc>'); // only the location-hidden species lives there
  expect(sitemap).not.toContain('/admin');
  const robots = await (await request.get('/robots.txt')).text();
  expect(robots).toMatch(/Disallow: \/admin/);
  expect(robots).toMatch(/Disallow: \/api\//);
  expect(robots).toMatch(/Sitemap: .*\/sitemap\.xml/);
});

test('a profile carries Open Graph tags with its licensed photo, and valid Taxon structured data', async ({ page }) => {
  await page.goto('/species/fictus-captivus');
  await expect(page.locator('meta[property="og:title"]')).toHaveAttribute('content', /Captive example lizard \(fixture\)/);
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute('content', /\/api\/v1\/media\/[a-f0-9]{64}\/1280\.webp$/);
  await expect(page.locator('meta[property="og:image:alt"]')).toHaveAttribute('content', /Generated test pattern/);
  const blocks = await page.locator('script[type="application/ld+json"]').allTextContents();
  const data = blocks.flatMap((b) => JSON.parse(b) as Array<{ '@type': string; name?: string; taxonRank?: string }>);
  const taxon = data.find((d) => d['@type'] === 'Taxon');
  expect(taxon).toMatchObject({ name: 'Fictus captivus', taxonRank: 'species' });
  expect(data.some((d) => d['@type'] === 'BreadcrumbList')).toBe(true);
});
