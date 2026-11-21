import { type NextRequest, NextResponse } from 'next/server';

/**
 * Content Security Policy with a fresh nonce per request (M5, DECISIONS D-029).
 * Next.js reads the nonce from the request's CSP header and puts it on its own scripts. The root layout calls
 * connection(), so every page renders per request and gets the nonce. API data is still cached by tag.
 *
 * - script-src: nonce + 'strict-dynamic'. No inline or third-party scripts. JSON-LD blocks are data, not scripts.
 * - style-src: 'unsafe-inline' because a few elements use style attributes (map legend swatches, next/image).
 *   Style injection cannot run code; scripts stay strict.
 * - worker-src blob: MapLibre starts its worker from a blob URL (D-016).
 * - img-src blob: data: MapLibre draws its canvas sprites from them. Every image is same-origin.
 * - connect-src 'self': the browser only talks to our own /api/v1. The basemap comes from our API, never a tile host.
 */
export function buildCsp(nonce: string, dev: boolean): string {
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${dev ? " 'unsafe-eval'" : ''}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' blob: data:",
    "font-src 'self'",
    "connect-src 'self'",
    "worker-src 'self' blob:",
    "manifest-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ].join('; ');
}

export function proxy(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString('base64');
  const csp = buildCsp(nonce, process.env.NODE_ENV === 'development');
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-nonce', nonce);
  requestHeaders.set('Content-Security-Policy', csp);
  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set('Content-Security-Policy', csp);
  return response;
}

export const config = {
  matcher: [
    {
      // Pages only: not the API proxy, the revalidate route, static assets or metadata files.
      source: '/((?!api/|_next/static|_next/image|vendor/|favicon.ico|robots.txt|sitemap.xml).*)',
      missing: [
        { type: 'header', key: 'next-router-prefetch' },
        { type: 'header', key: 'purpose', value: 'prefetch' },
      ],
    },
  ],
};
