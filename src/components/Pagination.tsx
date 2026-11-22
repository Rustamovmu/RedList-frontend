import Link from 'next/link';

/** "‹ Previous   Page 2 of 8   Next ›". Plain links, so Back/Forward and shared URLs keep the page. */
export function Pagination({ page, totalPages, href }: { page: number; totalPages: number; href: (page: number) => string }) {
  if (totalPages <= 1) return null;
  return (
    <nav aria-label="Pages" className="mt-12 flex items-center justify-between gap-4 border-t border-rule pt-5">
      {page > 1 ? (
        <Link href={href(page - 1)} className="more flex-row-reverse after:rotate-180" rel="prev">Previous</Link>
      ) : <span />}
      <span className="figures text-sm font-medium text-muted">Page {page} of {totalPages}</span>
      {page < totalPages ? <Link href={href(page + 1)} className="more" rel="next">Next</Link> : <span />}
    </nav>
  );
}
