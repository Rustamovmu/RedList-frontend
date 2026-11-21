import type { Metadata, Viewport } from 'next';
import { connection } from 'next/server';
import { SiteFooter } from '@/components/SiteFooter';
import { SiteHeader } from '@/components/SiteHeader';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'),
  title: { default: 'Wildward: understand, locate and help wildlife', template: '%s · Wildward' },
  description: 'Understand a species, discover where it lives, and find a credible way to help.',
  applicationName: 'Wildward',
  openGraph: { type: 'website', siteName: 'Wildward', locale: 'en_GB' },
  twitter: { card: 'summary_large_image' },
};

export const viewport: Viewport = { themeColor: '#1f3d2b' };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Every page renders per request so it gets the CSP nonce from src/proxy.ts (DECISIONS D-029).
  // API data is still cached by tag, so this costs a render, not an API call.
  await connection();
  return (
    <html lang="en">
      <body className="flex min-h-dvh flex-col">
        <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:rounded focus:bg-paper focus:px-3 focus:py-2 focus:text-ink">
          Skip to content
        </a>
        <SiteHeader />
        <main id="main" className="flex-1">
          {children}
        </main>
        <SiteFooter />
      </body>
    </html>
  );
}
