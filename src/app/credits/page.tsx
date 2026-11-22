import type { Metadata } from 'next';
import Link from 'next/link';
import { connection } from 'next/server';
import { PageHeader } from '@/components/PageHeader';
import type { components } from '@/contracts/api';
import { apiGet } from '@/lib/api';
import { licenceUrl } from '@/lib/media';

export const metadata: Metadata = {
  title: 'Photo credits',
  description: 'The creator, licence and source of every photograph on the published species profiles on Wildward.',
  alternates: { canonical: '/credits' },
};

type Credit = components['schemas']['PhotoCreditDto'];

/** Consecutive credits of the same species, in the API's order (by species name, then photo position). */
function bySpecies(credits: Credit[]): Credit[][] {
  const groups: Credit[][] = [];
  for (const c of credits) {
    const last = groups.at(-1);
    if (last && last[0].slug === c.slug) last.push(c);
    else groups.push([c]);
  }
  return groups;
}

/**
 * Photo credits (D-055). Catalogue photos carry no credit line under the picture. This page, linked from the
 * footer on every page, gives each photo's creator, licence and source, as CC BY / BY-SA attribution requires.
 * Built from GET /api/v1/credits, published data only.
 */
export default async function CreditsPage() {
  await connection(); // per request, still cached by tag, so a build never bakes in an API outage
  const credits = await apiGet('/api/v1/credits', { tags: ['catalogue'] }).catch(() => null);

  return (
    <div>
      <PageHeader
        kicker="Photographs"
        title="Photo credits"
        lead={
          <>
            Every photograph on a published profile, <strong>with its creator, licence and source</strong>. Each profile also lists its own photos under Sources.
          </>
        }
      />
      <div className="wrap">
        {credits === null ? (
          <p role="alert" className="notice-error mt-10">The photo credits could not be loaded right now.</p>
        ) : credits.length === 0 ? (
          <p className="missing mt-10">No photographs yet.</p>
        ) : (
          <ul className="mt-12 border-t border-rule md:mt-16">
            {bySpecies(credits).map((group) => (
              <li key={group[0].slug} className="grid gap-x-8 gap-y-2 border-b border-rule py-6 md:grid-cols-[minmax(0,18rem)_1fr]">
                <p className="text-lg font-semibold text-white">
                  <Link href={`/species/${group[0].slug}`} className="underline decoration-muted underline-offset-4 hover:text-lime hover:decoration-lime">
                    {group[0].commonName ?? <i>{group[0].scientificName}</i>}
                  </Link>
                  {group[0].commonName ? <span className="mt-0.5 block text-[0.9375rem] font-normal italic text-fog">{group[0].scientificName}</span> : null}
                </p>
                <ul className="min-w-0 space-y-2 text-[0.9375rem] text-fog">
                  {group.map((c, i) => (
                    <li key={i} className="break-words">
                      <CreditLine credit={c} />
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

/** The credit as recorded, then the licence (linked to its deed when known) unless the credit already names it, then the source. */
function CreditLine({ credit: c }: { credit: Credit }) {
  const deed = licenceUrl(c.license);
  const creditHasLicence = c.credit.toLowerCase().includes(c.license.toLowerCase());
  return (
    <>
      {c.credit}
      {creditHasLicence && !deed ? null : (
        <>
          {' · '}
          {deed ? (
            <a href={deed} rel="noopener noreferrer license" className="text-lime underline underline-offset-2">{c.license}</a>
          ) : (
            c.license
          )}
        </>
      )}
      {c.sourceUrl ? (
        <>
          {' · '}
          <a href={c.sourceUrl} rel="noopener noreferrer" className="text-lime underline underline-offset-2">Source</a>
        </>
      ) : null}
    </>
  );
}
