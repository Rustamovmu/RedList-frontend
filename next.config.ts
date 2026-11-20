import type { NextConfig } from 'next';

const apiInternal = process.env.API_INTERNAL_URL ?? 'http://localhost:4000';

const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(self)' },
];

const nextConfig: NextConfig = {
  // The Playwright suite builds into its own folder so it never disturbs a running dev server.
  distDir: process.env.NEXT_DIST_DIR ?? '.next',
  output: 'standalone',
  poweredByHeader: false,
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
