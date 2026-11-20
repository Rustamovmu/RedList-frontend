import type { Metadata } from 'next';
import Link from 'next/link';
import { connection } from 'next/server';
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
    <div className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="text-3xl font-semibold sm:text-4xl">Sources</h1>
      <p className="mt-3 text-lg text-ink-muted">
        Every source cited by a published profile, with the date we read it. Notes say how a source may be used, and when a figure is second-hand.
        See <Link href="/methodology" className="underline underline-offset-4">how we source facts</Link>.
      </p>
      {sources === null ? (
        <p role="alert" className="mt-6 rounded border border-status-cr p-4">The source list could not be loaded right now.</p>
      ) : sources.length === 0 ? (
        <p className="mt-6 italic text-ink-muted">No sources yet.</p>
      ) : (
        <ol className="mt-8 space-y-5">
          {sources.map((s) => (
            <li key={s.id} className="rounded border border-line bg-white/60 p-4">
              <p className="font-medium">
                {s.url ? <a href={s.url} rel="noopener noreferrer" className="underline underline-offset-2">{s.title}</a> : s.title}
              </p>
              <p className="mt-1 text-sm text-ink-muted">
                {[s.authors, s.publisher, s.publishedOn ? `published ${formatDate(s.publishedOn)}` : null, s.accessedOn ? `read ${formatDate(s.accessedOn)}` : null]
                  .filter(Boolean)
                  .join(' · ')}
                {s.doi ? <> · DOI {s.doi}</> : null}
                {s.license ? <> · Licence: {s.license}</> : null}
              </p>
              {s.note ? <p className="mt-2 text-sm">{s.note}</p> : null}
              {s.usedForBoundaries ? <p className="mt-2 text-sm">Used for country, sea and ocean boundaries on maps and region pages.</p> : null}
              {s.species.length ? (
                <p className="mt-2 text-sm">
                  Cited by:{' '}
                  {s.species.map((sp, i) => (
                    <span key={sp.slug}>
                      {i ? ', ' : ''}
                      <Link href={`/species/${sp.slug}`} className="underline underline-offset-2">{sp.commonName ?? <i>{sp.scientificName}</i>}</Link>
                    </span>
                  ))}
                </p>
              ) : null}
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
