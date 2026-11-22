'use client';

import Link from 'next/link';
import { compareHref, MAX_COMPARE, useCompare } from '@/components/compare/compare-store';

/** "Comparing 2 of 3" in the header, shown only while the visitor has species picked (kept in their browser). */
export function CompareCounter() {
  const selected = useCompare();
  if (!selected.length) return null;
  return (
    <Link
      href={compareHref(selected)}
      className="inline-flex min-h-9 items-center whitespace-nowrap border border-lime px-3 font-mono text-xs uppercase tracking-[0.1em] text-lime hover:bg-lime hover:text-black"
    >
      {/* Below 360px only the count shows; "Comparing" stays in the accessible name. */}
      <span className="max-[359px]:sr-only">Comparing&nbsp;</span>
      {selected.length} of {MAX_COMPARE}
    </Link>
  );
}
