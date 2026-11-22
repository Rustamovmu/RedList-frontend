'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCompare } from '@/components/compare/compare-store';
import { CompareCounter } from '@/components/shell/CompareCounter';
import { GridIcon } from '@/components/shell/Icons';

const TEXT_LINKS = [
  { href: '/map', label: 'Map' },
  { href: '/compare', label: 'Compare' },
  { href: '/about', label: 'About' },
];

/**
 * The four main links (PLAN §4): Map, Compare and About as text, and Explore as the solid button at the end, because
 * the catalogue is where most visits go. The current section is underlined (Explore turns white) and marked aria-current.
 */
export function NavLinks() {
  const path = usePathname();
  const selected = useCompare();
  const isCurrent = (href: string) => path === href || path.startsWith(`${href}/`);
  const exploring = isCurrent('/species');
  return (
    <ul className="flex flex-wrap items-center gap-x-5 md:gap-x-6 lg:gap-x-8">
      {TEXT_LINKS.map((n) => {
        const current = isCurrent(n.href);
        return (
          <li key={n.href}>
            <Link
              href={n.href}
              aria-current={current ? 'page' : undefined}
              className={`inline-flex min-h-11 items-center text-[0.9375rem] font-semibold text-white decoration-lime decoration-2 underline-offset-[10px] hover:underline ${current ? 'underline' : ''}`}
            >
              {n.label}
            </Link>
          </li>
        );
      })}
      {selected.length ? (
        <li className="hidden md:list-item">
          <CompareCounter />
        </li>
      ) : null}
      <li className="ml-auto md:ml-0">
        <Link
          href="/species"
          aria-current={exploring ? 'page' : undefined}
          className={`btn btn-sm btn-primary md:min-h-11 md:px-5 md:text-[0.8125rem] ${exploring ? 'border-white bg-white' : ''}`}
        >
          Explore
          <GridIcon />
        </Link>
      </li>
    </ul>
  );
}
