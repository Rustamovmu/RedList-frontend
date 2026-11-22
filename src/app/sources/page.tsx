import type { Metadata } from 'next';
import Link from 'next/link';
import { connection } from 'next/server';
import { PageHeader } from '@/components/PageHeader';
import { apiGet } from '@/lib/api';
import { formatDate } from '@/lib/labels';

export const metadata: Metadata = {
  title: 'Sources',
  description: 'Every source cited by the published species profiles on Wildward, with the species that cite it.',
  alternates: { canonical: '/sources' },
};

/** All sources cited by published content (PLAN §4 "Other pages"). Built from GET /api/v1/sources, published data only. */
export default async function SourcesPage() {
  await connection(); // per request, still cached by tag, so a build never bakes in an API outage
  const sources = await apiGet('/api/v1/sources', { tags: ['catalogue'] }).catch(() => null);

  return (
    <div>
      <PageHeader
        kicker="Evidence"
        title="Sources"
        lead={
          <>
            Every source cited by a published profile, <strong>with the date we read it</strong>. Notes say how a source may be used, and when a figure is second-hand.
            See <Link href="/methodology" className="text-lime underline decoration-1 underline-offset-4 hover:decoration-2">how we source facts</Link>.
          </>
        }
      />
      <div className="wrap">
        {sources === null ? (
          <p role="alert" className="notice-error mt-10">The source list could not be loaded right now.</p>
        ) : sources.length === 0 ? (
          <p className="missing mt-10">No sources yet.</p>
        ) : (
          <ol className="mt-12 border-t border-rule md:mt-16">
            {sources.map((s, i) => (
              <li key={s.id} className="grid gap-x-8 gap-y-2 border-b border-rule py-7 sm:grid-cols-[5rem_1fr] md:grid-cols-[7rem_1fr]">
                <span aria-hidden className="figures text-2xl font-bold tracking-[-0.02em] text-lime md:text-3xl">{String(i + 1).padStart(3, '0')}</span>
                <div className="min-w-0">
                  <p className="text-lg font-semibold text-white">
                    {s.url ? <a href={s.url} rel="noopener noreferrer" className="underline decoration-muted underline-offset-4 hover:text-lime hover:decoration-lime">{s.title}</a> : s.title}
                  </p>
                  <p className="meta mt-2 break-words">
                    {[s.authors, s.publisher, s.publishedOn ? `published ${formatDate(s.publishedOn)}` : null, s.accessedOn ? `read ${formatDate(s.accessedOn)}` : null]
                      .filter(Boolean)
                      .join(' · ')}
                    {s.doi ? <> · DOI {s.doi}</> : null}
                    {s.license ? <> · Licence: {s.license}</> : null}
                  </p>
                  {s.note ? <p className="prose-measure mt-3 text-[0.9375rem] text-fog">{s.note}</p> : null}
                  {s.usedForBoundaries ? <p className="mt-3 text-[0.9375rem] text-fog">Used for country, sea and ocean boundaries on maps and region pages.</p> : null}
                  {s.species.length ? (
                    <p className="mt-3 text-[0.9375rem] text-muted">
                      Cited by:{' '}
                      {s.species.map((sp, i) => (
                        <span key={sp.slug}>
                          {i ? ', ' : ''}
                          <Link href={`/species/${sp.slug}`} className="text-lime underline underline-offset-2">{sp.commonName ?? <i>{sp.scientificName}</i>}</Link>
                        </span>
                      ))}
                    </p>
                  ) : null}
                </div>
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}
