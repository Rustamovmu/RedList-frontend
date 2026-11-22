import Link from 'next/link';
import { RisingLines } from '@/components/shell/RisingLines';

const READ = [
  { href: '/methodology', label: 'Methodology' },
  { href: '/sources', label: 'Sources' },
  { href: '/support', label: 'Support directory' },
];
const LEGAL = [
  { href: '/privacy', label: 'Privacy' },
  { href: '/terms', label: 'Terms' },
];

export function SiteFooter() {
  return (
    <footer className="overflow-hidden border-t border-lime">
      <div className="wrap grid gap-10 pt-12 pb-10 md:grid-cols-[2fr_1fr_1fr]">
        <section aria-labelledby="footer-about">
          <h2 id="footer-about" className="kicker">About this site</h2>
          <p className="mt-3 max-w-[52ch] text-[0.9375rem] leading-relaxed text-fog">
            Wildward is an independent educational catalogue. It is not affiliated with the IUCN or any organization listed on it.
            Catalogue figures describe this site&apos;s coverage, not global biodiversity totals.
          </p>
        </section>
        <FooterLinks title="Read" links={READ} />
        <FooterLinks title="Legal" links={LEGAL} />
      </div>
      {/*
        Decoration, hidden from assistive technology: the wordmark is cropped at the bottom edge, and lines of light
        rise behind it from a glowing horizon (D-036). The top padding gives the lines room above the letters.
      */}
      <div aria-hidden className="relative select-none pt-[clamp(4rem,9vw,8rem)]">
        <RisingLines className="pointer-events-none absolute inset-0 h-full w-full" />
        <div className="wrap relative h-[0.68em] overflow-hidden text-[21vw] 2xl:text-[19rem]">
          <p className="type-display text-center leading-[0.8] text-lime">Wildward</p>
        </div>
      </div>
      <div className="wrap flex flex-wrap justify-between gap-x-6 gap-y-1 border-t border-rule py-4 font-mono text-xs text-muted">
        <p>built as an independent portfolio project</p>
        <p>boundaries: Natural Earth · photos: credited per image</p>
      </div>
    </footer>
  );
}

function FooterLinks({ title, links }: { title: string; links: Array<{ href: string; label: string }> }) {
  const id = `footer-${title.toLowerCase()}`;
  return (
    <nav aria-labelledby={id}>
      <h2 id={id} className="kicker">{title}</h2>
      <ul className="mt-3 space-y-1">
        {links.map((l) => (
          <li key={l.href}>
            <Link href={l.href} className="inline-flex min-h-8 items-center text-fog underline-offset-4 hover:text-lime hover:underline">
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
