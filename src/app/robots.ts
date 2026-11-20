import type { MetadataRoute } from 'next';
import { absolute } from '@/lib/site';

/** robots.txt (PLAN §4 SEO): everything public is crawlable; the staff area and the API are not. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: '*', allow: '/', disallow: ['/admin', '/api/', '/compare'] }],
    sitemap: absolute('/sitemap.xml'),
  };
}
