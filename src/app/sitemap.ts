import type { MetadataRoute } from 'next';
import { apiGet } from '@/lib/api';
import { absolute } from '@/lib/site';

/** Regenerated hourly at most; also revalidated with the catalogue tag when something is published. */
export const revalidate = 3600;

const STATIC = ['/', '/species', '/map', '/support', '/sources', '/about', '/methodology', '/privacy', '/terms'];

/** sitemap.xml: published content only (PLAN §4 SEO). Drafts never appear, because the API lists published species only. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const data = await apiGet('/api/v1/sitemap', { tags: ['catalogue'] }).catch(() => null);
  return [
    ...STATIC.map((p) => ({ url: absolute(p), changeFrequency: 'weekly' as const, priority: p === '/' ? 1 : 0.6 })),
    ...(data?.species ?? []).map((s) => ({ url: absolute(`/species/${s.slug}`), lastModified: s.publishedAt, changeFrequency: 'monthly' as const, priority: 0.8 })),
    ...(data?.regions ?? []).map((slug) => ({ url: absolute(`/regions/${slug}`), changeFrequency: 'monthly' as const, priority: 0.5 })),
  ];
}
