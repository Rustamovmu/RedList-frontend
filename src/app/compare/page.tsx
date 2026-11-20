import type { Metadata } from 'next';
import Link from 'next/link';
import { Fragment } from 'react';
import { CompareSync } from '@/components/compare/AddToCompare';
import { StatusBadge } from '@/components/StatusBadge';
import type { components } from '@/contracts/api';
import { ApiError, apiGet } from '@/lib/api';
import { BASIS_LABEL, ENVIRONMENT_LABEL, estimateValue, GROUP_LABEL, referencePeriod, TREND_LABEL } from '@/lib/labels';

export const metadata: Metadata = { title: 'Compare species', robots: { index: false, follow: true } };

type Profile = components['schemas']['SpeciesProfileDto'];
const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const MAX = 3;

const Unknown = ({ children = 'Unknown' }: { children?: React.ReactNode }) => <span className="italic text-ink-muted">{children}</span>;

/** The rows of PLAN §4 Compare, in order. Each renders one species' cell. No scores, no totals, no charts. */
const ROWS: Array<{ key: string; label: string; cell: (p: Profile) => React.ReactNode }> = [
  {
    key: 'status',
    label: 'Status',
    cell: (p) =>
      p.status.assessments.length ? (
        <ul className="space-y-2">
          {p.status.assessments.map((a, i) => (
            <li key={i}>
              <StatusBadge category={a.category} year={a.assessedOn ? Number(a.assessedOn.slice(0, 4)) : undefined} scope={a.scope} size="sm" />
              <div className="mt-1 text-xs text-ink-muted">
                {a.scope === 'global' ? 'Global' : (a.region?.name ?? 'Regional')} · {TREND_LABEL[a.trend]}
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <Unknown>{p.status.notAssessed ? 'Not assessed' : 'Unknown'}</Unknown>
      ),
  },
  {
    key: 'population',
    label: 'Population',
    cell: (p) =>
      p.population.estimates.length ? (
        <ul className="space-y-2">
          {p.population.estimates.map((e, i) => {
            const v = estimateValue(e);
            const period = referencePeriod(e.referenceStart, e.referenceEnd);
            return (
              <li key={i}>
                <span className="font-semibold">{v ?? 'Unknown'}</span>
                {v && e.form !== 'qualitative' ? ` ${BASIS_LABEL[e.basis]}` : ''}
                <div className="text-xs text-ink-muted">
                  {e.context === 'wild' ? 'Wild' : 'Captive'} · {e.scope === 'global' ? 'Global' : (e.region?.name ?? 'Regional')}
                  {period ? ` · ${period}` : ''}
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <Unknown />
      ),
  },
  { key: 'group', label: 'Animal group', cell: (p) => GROUP_LABEL[p.displayGroup] },
  {
    key: 'habitats',
    label: 'Habitats',
    cell: (p) => (p.geography.habitats.length ? p.geography.habitats.map((h) => h.name).join(', ') : <Unknown>Not yet documented</Unknown>),
  },
  {
    key: 'diet',
    label: 'Diet',
    cell: (p) =>
      p.diet.narrative || p.diet.tags.length ? (p.diet.tags.length ? p.diet.tags.join(', ') : p.diet.narrative) : <Unknown>Not yet documented</Unknown>,
  },
  {
    key: 'geography',
    label: 'Where it lives',
    cell: (p) => (
      <>
        <div>{p.geography.environments.map((e) => ENVIRONMENT_LABEL[e]).join(', ') || <Unknown />}</div>
        <div className="text-xs text-ink-muted">
          {p.geography.locationWithheld
            ? 'Locations withheld to protect this species'
            : p.geography.regions.length
              ? p.geography.regions.map((r) => r.region.name).join(', ')
              : 'Countries not yet documented'}
        </div>
      </>
    ),
  },
  {
    key: 'threats',
    label: 'Threats',
    cell: (p) => (p.threats.threats.length ? p.threats.threats.map((t) => t.name).join(', ') : <Unknown>None documented yet</Unknown>),
  },
];

function parse(raw: string | string[] | undefined): string[] | 'invalid' {
  const list = [...new Set((Array.isArray(raw) ? raw : raw ? [raw] : []).flatMap((x) => x.split(',')).map((x) => x.trim()).filter(Boolean))];
  if (list.length > MAX || list.some((s) => !SLUG.test(s))) return 'invalid';
  return list;
}

export default async function ComparePage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const slugs = parse((await searchParams).species);

  if (slugs === 'invalid') {
    return (
      <Shell>
        <p role="alert" className="rounded border border-status-cr p-4">Compare takes 1 to {MAX} species. <Link href="/compare" className="underline">Start again</Link>.</p>
      </Shell>
    );
  }
  if (!slugs.length) {
    return (
      <Shell>
        <CompareSync slugs={[]} />
        <p>Pick up to {MAX} species to see them side by side. Use “Add to compare” on any species page.</p>
        <p className="mt-3"><Link href="/species" className="text-forest-light underline underline-offset-4">Explore species</Link></p>
      </Shell>
    );
  }

  let data: components['schemas']['CompareDto'];
  try {
    data = await apiGet('/api/v1/compare', { query: { species: slugs.join(',') }, tags: ['catalogue', ...slugs.map((s) => `species:${s}`)] });
  } catch (e) {
    return (
      <Shell>
        <p role="alert" className="rounded border border-status-cr p-4">
          {e instanceof ApiError && e.status === 404
            ? 'One or more of these species is not in the catalogue.'
            : 'The comparison could not be loaded. This is a problem on our side.'}{' '}
          <Link href="/species" className="underline">Explore species</Link>.
        </p>
      </Shell>
    );
  }

  const remove = (slug: string) => {
    const rest = slugs.filter((s) => s !== slug);
    return rest.length ? `/compare?species=${rest.join(',')}` : '/compare';
  };
  const name = (p: Profile) => p.commonName ?? p.scientificName;
  const note = (
    <p className={`rounded border p-3 text-sm ${data.population.status === 'same_basis' ? 'border-line bg-white/60' : 'border-status-vu bg-white/60'}`} data-testid="population-comparability">
      <strong>Population: </strong>
      {data.population.message}
    </p>
  );

  return (
    <Shell>
      <CompareSync slugs={slugs} />
      <p className="text-sm text-ink-muted">
        Side by side, with no overall score. Figures with different units, places or dates are never combined.
        {slugs.length < MAX ? <> You can add {MAX - slugs.length} more from any species page.</> : null}
      </p>

      {/* Desktop: one column per species */}
      <div className="mt-6 hidden md:block">
        <table className="w-full table-fixed border-collapse text-sm">
          <caption className="sr-only">Comparison of {data.species.map(name).join(', ')}</caption>
          <thead>
            <tr>
              <td className="w-36" />
              {data.species.map((p) => (
                <th key={p.slug} scope="col" className="border-b border-line p-3 text-left align-bottom">
                  <Link href={`/species/${p.slug}`} className="font-serif text-lg font-semibold hover:underline">{name(p)}</Link>
                  {p.commonName ? <div className="text-sm font-normal italic text-ink-muted">{p.scientificName}</div> : null}
                  <Link href={remove(p.slug)} className="mt-1 inline-block text-xs font-normal underline">Remove</Link>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ROWS.map((r) => (
              <Fragment key={r.key}>
                <tr className="border-b border-line align-top">
                  <th scope="row" className="p-3 text-left font-semibold">{r.label}</th>
                  {data.species.map((p) => (
                    <td key={p.slug} className="p-3">{r.cell(p)}</td>
                  ))}
                </tr>
                {r.key === 'population' ? (
                  <tr>
                    <td />
                    <td colSpan={data.species.length} className="px-3 pb-3">{note}</td>
                  </tr>
                ) : null}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile: stacked, one card per species */}
      <div className="mt-6 space-y-6 md:hidden">
        {note}
        {data.species.map((p) => (
          <section key={p.slug} aria-label={name(p)} className="rounded-lg border border-line bg-white/60 p-4">
            <h2 className="font-serif text-xl font-semibold">
              <Link href={`/species/${p.slug}`} className="hover:underline">{name(p)}</Link>
            </h2>
            {p.commonName ? <p className="text-sm italic text-ink-muted">{p.scientificName}</p> : null}
            <dl className="mt-3 space-y-3 text-sm">
              {ROWS.map((r) => (
                <div key={r.key}>
                  <dt className="font-semibold">{r.label}</dt>
                  <dd className="mt-1">{r.cell(p)}</dd>
                </div>
              ))}
            </dl>
            <Link href={remove(p.slug)} className="mt-3 inline-block text-sm underline">Remove from comparison</Link>
          </section>
        ))}
      </div>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="mb-4 text-3xl font-semibold">Compare species</h1>
      {children}
    </div>
  );
}
