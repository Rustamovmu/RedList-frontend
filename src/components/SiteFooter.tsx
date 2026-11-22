import Link from 'next/link';
import { HomeLink } from '@/components/shell/HomeLink';
import { Mark, Wordmark } from '@/components/shell/Mark';
import { RisingLines } from '@/components/shell/RisingLines';

const COLUMNS = [
  {
    title: 'Explore',
    links: [
      { href: '/species', label: 'Explore species' },
      { href: '/map', label: 'Map' },
      { href: '/compare', label: 'Compare' },
    ],
  },
  {
    title: 'About our data',
    links: [
      { href: '/methodology', label: 'Methodology' },
      { href: '/sources', label: 'Sources' },
      { href: '/credits', label: 'Photo credits' },
      { href: '/support', label: 'Support directory' },
    ],
  },
  {
    title: 'Wildward',
    links: [
      { href: '/about', label: 'About' },
      { href: '/privacy', label: 'Privacy' },
      { href: '/terms', label: 'Terms' },
    ],
  },
];

/**
 * A plain black footer: the brand and what the site is on the left, three link columns, then a thin band of rising
 * lines (D-036) that ends in a glowing horizon above the bottom row.
 */
export function SiteFooter() {
  return (
    <footer className="overflow-hidden border-t border-rule bg-black">
      <div className="wrap grid gap-x-10 gap-y-12 pt-16 pb-6 sm:grid-cols-2 lg:grid-cols-[1.6fr_1fr_1fr_1fr] lg:pt-20">
        <section aria-labelledby="footer-about">
          <h2 id="footer-about" className="sr-only">About this site</h2>
          {/* The logo links home, like the header's: on the home page it scrolls back up to the hero (D-056). */}
          <p>
            <HomeLink className="inline-flex min-h-11 items-center gap-3 text-white">
              <Mark className="h-11 w-11 text-lime" />
              <Wordmark className="text-[1.875rem] leading-none" />
            </HomeLink>
          </p>
          <p className="mt-6 max-w-[42ch] text-[0.9375rem] leading-relaxed text-muted">
            Wildward is an independent educational catalogue. It is not affiliated with the IUCN or any organization listed on it.
            Catalogue figures describe this site&apos;s coverage, not global biodiversity totals.
          </p>
        </section>
        {COLUMNS.map((c) => (
          <FooterLinks key={c.title} title={c.title} links={c.links} />
        ))}
      </div>
      {/* Decoration, hidden from assistive technology: lines of light rise from a horizon at the band's lower edge (D-036). */}
      <div aria-hidden className="relative h-20 select-none sm:h-28">
        <RisingLines className="pointer-events-none absolute inset-0 h-full w-full" />
      </div>
      <div className="wrap flex flex-wrap justify-between gap-x-6 gap-y-2 py-6 text-sm text-muted">
        <p>Built as an independent portfolio project.</p>
        <p>Boundaries: Natural Earth</p>
      </div>
    </footer>
  );
}

function FooterLinks({ title, links }: { title: string; links: Array<{ href: string; label: string }> }) {
  const id = `footer-${title.toLowerCase().replace(/\s+/g, '-')}`;
  return (
    <nav aria-labelledby={id}>
      <h2 id={id} className="text-base font-semibold text-muted">{title}</h2>
      <ul className="mt-4 space-y-1">
        {links.map((l) => (
          <li key={l.href}>
            <Link href={l.href} className="inline-flex min-h-10 items-center text-[1.0625rem] font-medium text-white underline-offset-4 hover:text-lime hover:underline">
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
