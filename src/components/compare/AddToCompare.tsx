'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { compareHref, MAX_COMPARE, useCompare, writeCompare } from './compare-store';

/** "Add to compare" on a profile (PLAN §4). At most 3; the button explains why it is disabled when full. */
export function AddToCompare({ slug, name }: { slug: string; name: string }) {
  const selected = useCompare();
  const added = selected.includes(slug);
  const full = !added && selected.length >= MAX_COMPARE;

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
      <button
        type="button"
        aria-pressed={added}
        disabled={full}
        onClick={() => writeCompare(added ? selected.filter((s) => s !== slug) : [...selected, slug])}
        className={`btn ${added ? 'btn-secondary' : 'btn-primary'}`}
      >
        {added ? 'Remove from compare' : 'Add to compare'}
      </button>
      <span aria-live="polite" className="max-w-[36ch] text-[0.8125rem] leading-relaxed text-muted">
        {added ? `${name} is in your comparison. ` : full ? `Compare holds ${MAX_COMPARE} species. Remove one first. ` : null}
        {selected.length ? (
          <Link href={compareHref(selected)} className="inline-flex min-h-6 items-center font-semibold text-lime underline underline-offset-4">
            Compare ({selected.length} of {MAX_COMPARE})
          </Link>
        ) : null}
      </span>
    </div>
  );
}

/** On /compare: makes the stored basket match the URL being viewed, so Add/Remove elsewhere stays consistent. */
export function CompareSync({ slugs }: { slugs: string[] }) {
  const key = slugs.join(',');
  useEffect(() => {
    writeCompare(key ? key.split(',') : []);
  }, [key]);
  return null;
}
