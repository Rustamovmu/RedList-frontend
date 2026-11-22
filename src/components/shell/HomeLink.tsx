'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

/** The header logo's id, so a click on the footer logo can move keyboard focus back to the top of the page. */
const HOME_LINK_ID = 'home-link';

/**
 * The Wildward logo as a link home, in the header and the footer (D-056). From any other page it is a normal link to
 * "/". On the home page itself Next.js would not move (same URL), so it scrolls back up to the hero, smoothly unless
 * the visitor prefers reduced motion, and puts keyboard focus on the header logo, so Tab continues from the top.
 * A modified click (new tab, new window) is left to the browser. `primary` marks the header logo, the focus target.
 */
export function HomeLink({ primary = false, className, children }: { primary?: boolean; className?: string; children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <Link
      href="/"
      id={primary ? HOME_LINK_ID : undefined}
      className={className}
      onClick={(e) => {
        if (pathname !== '/' || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
        e.preventDefault();
        const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
        document.getElementById(HOME_LINK_ID)?.focus({ preventScroll: true });
      }}
    >
      {children}
    </Link>
  );
}
