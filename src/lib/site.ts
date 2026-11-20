/** The public site origin, used for absolute URLs in the sitemap, robots.txt, Open Graph and structured data. */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000').replace(/\/$/, '');
export const SITE_NAME = 'Wildward';
export const absolute = (path: string) => `${SITE_URL}${path.startsWith('/') ? path : `/${path}`}`;

/** Serializes JSON-LD for a <script> tag. "<" is escaped so the data can never close the script element. */
export function jsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/</g, '\\u003c');
}
