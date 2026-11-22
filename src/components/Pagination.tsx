import Link from 'next/link';

/** "← Previous   Page 2 of 8   Next →". Plain links, so Back/Forward and shared URLs keep the page. */
export function Pagination({ page, totalPages, href }: { page: number; totalPages: number; href: (page: number) => string }) {
  if (totalPages <= 1) return null;
  const cls = 'inline-flex min-h-11 items-center gap-2 font-mono text-[0.8125rem] uppercase tracking-[0.1em] text-lime hover:underline underline-offset-4';
  return (
    <nav aria-label="Pages" className="mt-10 flex items-center justify-between gap-4 border-t border-rule pt-4">
      {page > 1 ? <Link href={href(page - 1)} className={cls} rel="prev"><span aria-hidden>←</span> Previous</Link> : <span />}
      <span className="font-mono text-xs uppercase tracking-[0.1em] text-muted">Page {page} of {totalPages}</span>
      {page < totalPages ? <Link href={href(page + 1)} className={cls} rel="next">Next <span aria-hidden>→</span></Link> : <span />}
    </nav>
  );
}
