import { AccountLink } from '@/components/shell/AccountLink';
import { CompareCounter } from '@/components/shell/CompareCounter';
import { HeaderBar } from '@/components/shell/HeaderBar';
import { HomeLink } from '@/components/shell/HomeLink';
import { Mark, Wordmark } from '@/components/shell/Mark';
import { NavLinks } from '@/components/shell/NavLinks';

/**
 * The nav row: the logo on the left; on the right the text links and Explore as the solid button. It is sticky
 * (HeaderBar, D-049): transparent at the top, so the home hero and PageHeader show through it (they pull themselves up
 * by --nav-h), and solid black once the page scrolls.
 * No hamburger: at 360px the links move to a second row and stay visible. The compare counter sits in the nav on
 * md+ and beside the logo below md (one of the two is display:none, so it is announced once). The account link
 * (Sign in, or who is signed in; D-066) follows the same pattern: last in the nav on md+, beside the logo below md.
 */
export function SiteHeader() {
  return (
    <HeaderBar>
      <div className="wrap grid min-h-[var(--nav-h)] grid-cols-[1fr_auto] content-center items-center gap-x-3 gap-y-0.5 [grid-template-areas:'logo_count''nav_nav'] md:flex md:items-center md:justify-between md:gap-10">
        {/* Home, or back up to the hero when already on the home page (D-056). */}
        {/* A size smaller below 340px, so the logo row still holds the compare counter and the account link (D-066). */}
        <HomeLink primary className="inline-flex min-h-11 items-center gap-3 justify-self-start text-white [grid-area:logo] max-[339px]:gap-2">
          <Mark className="h-9 w-9 text-lime max-[339px]:h-8 max-[339px]:w-8" />
          <Wordmark className="text-[1.75rem] leading-none max-[339px]:text-[1.5rem]" />
        </HomeLink>
        <div className="flex items-center gap-2 justify-self-end [grid-area:count] md:hidden">
          <CompareCounter />
          <AccountLink />
        </div>
        <nav aria-label="Main" className="[grid-area:nav]">
          <NavLinks />
        </nav>
      </div>
    </HeaderBar>
  );
}
