import Link from 'next/link';
import { CompareCounter } from '@/components/shell/CompareCounter';
import { Mark } from '@/components/shell/Mark';
import { NavLinks } from '@/components/shell/NavLinks';

/**
 * Announcement bar + nav row. The nav row has no background of its own, so on the home page the hero photo
 * shows through it (the hero pulls itself up by --nav-h). No hamburger and no header search: the four links
 * stay visible at 360px.
 */
export function SiteHeader() {
  return (
    <header>
      <div className="on-lime bg-lime text-black">
        <p className="wrap flex min-h-11 items-center justify-center py-1.5 text-center font-mono text-xs uppercase tracking-[0.1em] sm:text-[0.8125rem]">
          <Link href="/methodology" className="underline-offset-4 hover:underline">
            Every fact on Wildward is cited. See how we know
          </Link>
        </p>
      </div>
      <div className="relative z-30 h-[var(--nav-h)]">
        <div className="wrap grid h-full grid-cols-[1fr_auto] content-center items-center gap-y-1 [grid-template-areas:'logo_count''nav_nav'] md:grid-cols-[1fr_auto_1fr] md:[grid-template-areas:'logo_nav_count']">
          <Link href="/" className="inline-flex min-h-11 items-center gap-2.5 justify-self-start font-mono text-[0.9375rem] font-bold uppercase tracking-[0.12em] text-lime [grid-area:logo]">
            <Mark />
            Wildward
          </Link>
          <nav aria-label="Main" className="[grid-area:nav]">
            <NavLinks />
          </nav>
          <div className="justify-self-end [grid-area:count]">
            <CompareCounter />
          </div>
        </div>
      </div>
    </header>
  );
}
