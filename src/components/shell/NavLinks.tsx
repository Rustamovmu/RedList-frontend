'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV = [
  { href: '/species', label: 'Explore' },
  { href: '/map', label: 'Map' },
  { href: '/compare', label: 'Compare' },
  { href: '/about', label: 'About' },
];

/** The four main links (PLAN §4). The current section is underlined and marked aria-current. */
export function NavLinks() {
  const path = usePathname();
  return (
    <ul className="flex flex-wrap justify-center gap-x-1 font-mono text-[0.8125rem] uppercase tracking-[0.1em] sm:gap-x-3">
      {NAV.map((n) => {
        const current = path === n.href || path.startsWith(`${n.href}/`);
        return (
          <li key={n.href}>
            <Link
              href={n.href}
              aria-current={current ? 'page' : undefined}
              className={`inline-flex min-h-11 items-center px-2 text-lime underline-offset-[6px] hover:underline ${current ? 'underline decoration-2' : ''}`}
            >
              {n.label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
