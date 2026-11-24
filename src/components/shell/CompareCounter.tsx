'use client';

import Link from 'next/link';
import { compareHref, MAX_COMPARE, useCompare } from '@/components/compare/compare-store';

/** "Comparing 2 of 3" in the header: an outlined button, shown only while the visitor has species picked (kept in their browser). */
export function CompareCounter() {
  const selected = useCompare();
  if (!selected.length) return null;
  return (
    <Link href={compareHref(selected)} className="btn btn-sm btn-secondary whitespace-nowrap md:min-h-11 md:px-5 md:text-[0.8125rem]">
      {/* Below 440px, and in the tighter md row, only the count shows; "Comparing" stays in the accessible name.
          The full label, beside the logo and the account link, needs about 430px (D-059, D-066). */}
      <span className="max-[439px]:sr-only md:max-lg:sr-only">Comparing&nbsp;</span>
      {selected.length} of {MAX_COMPARE}
    </Link>
  );
}
