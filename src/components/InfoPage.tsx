import { Children, cloneElement, isValidElement, type ReactElement } from 'react';
import { SectionHead } from '@/components/SectionHead';

type SectionProps = { id: string; title: string; n?: number; children: React.ReactNode };

/**
 * Layout for the static information pages (about, methodology, privacy, terms): a long-reading column with a
 * sticky "On this page" list built from the InfoSection children, which it also numbers.
 */
export function InfoPage({
  kicker, title, lead, updated, summary, children,
}: { kicker: string; title: string; lead: string; updated: string; summary?: React.ReactNode; children: React.ReactNode }) {
  const sections = Children.toArray(children).filter((c): c is ReactElement<SectionProps> => isValidElement(c));
  return (
    <article className="wrap pt-10 md:pt-16">
      <p className="kicker">{kicker}</p>
      <h1 className="h-page mt-3 max-w-[14ch]">{title}</h1>
      <p className="lead mt-8">{lead}</p>
      {summary ? <div className="mt-8 max-w-[68ch]">{summary}</div> : null}

      <div className="mt-16 grid grid-cols-[minmax(0,1fr)] gap-x-16 gap-y-12 md:mt-24 md:grid-cols-[13rem_minmax(0,1fr)] lg:grid-cols-[16rem_minmax(0,1fr)]">
        <nav aria-labelledby="toc-h" className="md:sticky md:top-8 md:self-start">
          <p id="toc-h" className="label">On this page</p>
          <ol className="mt-3 border-t border-rule">
            {sections.map((s, i) => (
              <li key={s.props.id} className="border-b border-rule">
                <a href={`#${s.props.id}`} className="flex min-h-11 items-center gap-3 py-1 font-mono text-xs uppercase tracking-[0.08em] text-fog hover:text-lime">
                  <span className="text-lime">{String(i + 1).padStart(2, '0')}</span>
                  {s.props.title}
                </a>
              </li>
            ))}
          </ol>
        </nav>
        <div className="min-w-0 space-y-20">{sections.map((s, i) => cloneElement(s, { n: i + 1 }))}</div>
      </div>

      <p className="meta mt-24 border-t border-rule pt-4">Last updated {updated}.</p>
    </article>
  );
}

export function InfoSection({ id, title, n, children }: SectionProps) {
  return (
    <section aria-labelledby={`${id}-h`} id={id} className="scroll-mt-8">
      <SectionHead id={`${id}-h`} n={n ? String(n).padStart(2, '0') : undefined} title={title} />
      <div className="info-body mt-6">{children}</div>
    </section>
  );
}
