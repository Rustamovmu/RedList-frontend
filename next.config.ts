import type { NextConfig } from 'next';

const apiInternal = process.env.API_INTERNAL_URL ?? 'http://localhost:4000';

const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(self), payment=(), usb=()' },
  { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
  // The Content-Security-Policy header is set per request in src/proxy.ts (it carries a nonce).
  // HSTS is set by Nginx, where TLS ends (deploy/nginx in the backend repo).
];

const nextConfig: NextConfig = {
  // The Playwright suite builds into its own folder so it never disturbs a running dev server.
  distDir: process.env.NEXT_DIST_DIR ?? '.next',
  output: 'standalone',
  poweredByHeader: false,
  // No Next.js dev-tools badge in the corner during `next dev` (D-055). Build errors still show as an overlay.
  devIndicators: false,
  // Catalogue images come from our own API as pre-generated WebP widths (M4). No Next.js image optimizer and
  // no remote image hosts: the custom loader only ever builds same-origin /api/v1/media URLs.
  images: {
    loader: 'custom',
    loaderFile: './src/lib/image-loader.ts',
    deviceSizes: [640, 960, 1280, 1920],
    imageSizes: [320],
  },
  // The browser calls same-origin /api/v1/*. In development Next proxies those calls to the API.
  // In production Nginx routes /api/v1 straight to the API, and this rewrite is only a fallback.
  async rewrites() {
    return [{ source: '/api/v1/:path*', destination: `${apiInternal}/api/v1/:path*` }];
  },
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }];
  },
};

export default nextConfig;
