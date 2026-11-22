import { Children, cloneElement, isValidElement, type ReactElement } from 'react';
import { type HeaderImage, PageHeader } from '@/components/PageHeader';
import { SectionHead } from '@/components/SectionHead';

type SectionProps = { id: string; title: string; n?: number; children: React.ReactNode };

/**
 * Layout for the static information pages (about, methodology, privacy, terms): a long-reading column with a
 * sticky "On this page" list built from the InfoSection children, which it also numbers.
 */
export function InfoPage({
  kicker, title, lead, updated, summary, image, children,
}: { kicker: string; title: string; lead: React.ReactNode; updated: string; summary?: React.ReactNode; image?: HeaderImage; children: React.ReactNode }) {
  const sections = Children.toArray(children).filter((c): c is ReactElement<SectionProps> => isValidElement(c));
  return (
    <article>
      <PageHeader kicker={kicker} title={title} lead={lead} titleClassName="max-w-[18ch]" image={image}>
        {summary ? <div className="mt-8 max-w-[68ch]">{summary}</div> : null}
      </PageHeader>

      <div className="wrap mt-14 grid grid-cols-[minmax(0,1fr)] gap-x-16 gap-y-12 md:mt-20 md:grid-cols-[13rem_minmax(0,1fr)] lg:grid-cols-[16rem_minmax(0,1fr)] xl:gap-x-24">
        <nav aria-labelledby="toc-h" className="md:sticky md:top-[calc(var(--nav-h)+2rem)] md:self-start">
          <p id="toc-h" className="label">On this page</p>
          <ol className="mt-3 border-t border-rule">
            {sections.map((s, i) => (
              <li key={s.props.id} className="border-b border-rule">
                <a href={`#${s.props.id}`} className="flex min-h-11 items-center gap-3 py-1 text-sm font-medium text-fog hover:text-lime">
                  <span className="figures text-xs font-bold text-lime">{String(i + 1).padStart(2, '0')}</span>
                  {s.props.title}
                </a>
              </li>
            ))}
          </ol>
        </nav>
        <div className="min-w-0 space-y-20">{sections.map((s, i) => cloneElement(s, { n: i + 1 }))}</div>
      </div>

      <p className="wrap meta mt-24">
        <span className="block border-t border-rule pt-4">Last updated {updated}.</span>
      </p>
    </article>
  );
}

export function InfoSection({ id, title, n, children }: SectionProps) {
  return (
    <section aria-labelledby={`${id}-h`} id={id} className="scroll-mt-8">
      <SectionHead id={`${id}-h`} n={n ? String(n).padStart(2, '0') : undefined} title={title} rule />
      <div className="info-body mt-6">{children}</div>
    </section>
  );
}
