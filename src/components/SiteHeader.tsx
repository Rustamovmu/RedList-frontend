import Link from 'next/link';
import { CompareCounter } from '@/components/shell/CompareCounter';
import { Mark, Wordmark } from '@/components/shell/Mark';
import { NavLinks } from '@/components/shell/NavLinks';

/**
 * The nav row: the logo on the left; on the right the text links and Explore as the solid button. It has no
 * background of its own, so on the home page the hero photo shows through it (the hero pulls itself up by --nav-h).
 * No hamburger: at 360px the links move to a second row and stay visible. The compare counter sits in the nav on
 * md+ and beside the logo below md (one of the two is display:none, so it is announced once).
 */
export function SiteHeader() {
  return (
    <header className="relative z-30">
      <div className="wrap grid min-h-[var(--nav-h)] grid-cols-[1fr_auto] content-center items-center gap-y-0.5 [grid-template-areas:'logo_count''nav_nav'] md:flex md:items-center md:justify-between md:gap-10">
        <Link href="/" className="inline-flex min-h-11 items-center gap-3 justify-self-start text-white [grid-area:logo]">
          <Mark className="h-9 w-9 text-lime" />
          <Wordmark className="text-[1.5rem] leading-none" />
        </Link>
        <div className="justify-self-end [grid-area:count] md:hidden">
          <CompareCounter />
        </div>
        <nav aria-label="Main" className="[grid-area:nav]">
          <NavLinks />
        </nav>
      </div>
    </header>
  );
}
