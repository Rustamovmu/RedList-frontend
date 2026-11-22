import type { Metadata, Viewport } from 'next';
import { connection } from 'next/server';
// Self-hosted font (SIL Open Font License), bundled from npm so the CSP can keep font-src 'self' (DECISIONS D-038).
// The italic matters: scientific names are always set in a true italic, never a slanted roman.
import '@fontsource-variable/plus-jakarta-sans/wght.css';
import '@fontsource-variable/plus-jakarta-sans/wght-italic.css';
// The wordmark only: Quicksand, a rounded face (SIL Open Font License, D-043). Only the Latin file is downloaded.
import '@fontsource-variable/quicksand/wght.css';
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

export const viewport: Viewport = { themeColor: '#000000', colorScheme: 'dark' };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Every page renders per request so it gets the CSP nonce from src/proxy.ts (DECISIONS D-029).
  // API data is still cached by tag, so this costs a render, not an API call.
  await connection();
  return (
    <html lang="en">
      <body className="flex min-h-dvh flex-col">
        <a
          href="#main"
          className="on-lime sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:bg-lime focus:px-4 focus:py-3 focus:text-sm focus:font-bold focus:uppercase focus:tracking-[0.05em] focus:text-black"
        >
          Skip to content
        </a>
        <SiteHeader />
        <main id="main" className="flex-1 pb-24 [&:has(>.flush-bottom)]:pb-0">
          {children}
        </main>
        <SiteFooter />
      </body>
    </html>
  );
}
