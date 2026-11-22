import type { Metadata } from 'next';
import Link from 'next/link';
import { Fragment } from 'react';
import { CompareSync } from '@/components/compare/AddToCompare';
import { PageHeader } from '@/components/PageHeader';
import { StatusBadge } from '@/components/StatusBadge';
import type { components } from '@/contracts/api';
import { ApiError, apiGet } from '@/lib/api';
import { BASIS_LABEL, ENVIRONMENT_LABEL, estimateValue, GROUP_LABEL, referencePeriod, TREND_LABEL } from '@/lib/labels';

export const metadata: Metadata = { title: 'Compare species', robots: { index: false, follow: true } };

type Profile = components['schemas']['SpeciesProfileDto'];
const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const MAX = 3;

const Unknown = ({ children = 'Unknown' }: { children?: React.ReactNode }) => <span className="missing">{children}</span>;

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
              <div className="mt-1.5 text-[0.8125rem] text-muted">
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
                <span className="font-semibold text-white">{v ?? 'Unknown'}</span>
                {v && e.form !== 'qualitative' ? ` ${BASIS_LABEL[e.basis]}` : ''}
                <div className="mt-0.5 text-[0.8125rem] text-muted">
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
        <div className="mt-1 text-[0.8125rem] text-muted">
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
        <p role="alert" className="notice-error">Compare takes 1 to {MAX} species. <Link href="/compare" className="underline underline-offset-4">Start again</Link>.</p>
      </Shell>
    );
  }
  if (!slugs.length) {
    return (
      <Shell>
        <CompareSync slugs={[]} />
        <div className="grid items-center gap-8 md:grid-cols-[auto_1fr] md:gap-16">
          <p aria-hidden className="figures text-[clamp(6rem,16vw,11rem)] font-bold leading-none tracking-[-0.05em] text-rule">0/{MAX}</p>
          <div>
            <p className="max-w-[40ch] text-xl leading-snug text-white sm:text-2xl sm:leading-snug">Pick up to {MAX} species to see them side by side. Use “Add to compare” on any species page.</p>
            <Link href="/species" className="btn btn-primary go mt-8">Explore species</Link>
          </div>
        </div>
      </Shell>
    );
  }

  let data: components['schemas']['CompareDto'];
  try {
    data = await apiGet('/api/v1/compare', { query: { species: slugs.join(',') }, tags: ['catalogue', ...slugs.map((s) => `species:${s}`)] });
  } catch (e) {
    return (
      <Shell>
        <p role="alert" className="notice-error">
          {e instanceof ApiError && e.status === 404
            ? 'One or more of these species is not in the catalogue.'
            : 'The comparison could not be loaded. This is a problem on our side.'}{' '}
          <Link href="/species" className="underline underline-offset-4">Explore species</Link>.
        </p>
      </Shell>
    );
  }

  const remove = (slug: string) => {
    const rest = slugs.filter((s) => s !== slug);
    return rest.length ? `/compare?species=${rest.join(',')}` : '/compare';
  };
  const name = (p: Profile) => p.commonName ?? p.scientificName;
  const comparable = data.population.status === 'same_basis';
  const note = (
    <p
      className={`px-5 py-4 text-[0.9375rem] leading-snug ${comparable ? 'notice text-fog' : 'on-lime bg-lime font-medium text-black'}`}
      data-testid="population-comparability"
    >
      <strong className="mr-1 font-bold">Population: </strong>
      {data.population.message}
    </p>
  );

  return (
    <Shell>
      <CompareSync slugs={slugs} />
      {slugs.length < MAX ? <p className="meta mb-8">You can add {MAX - slugs.length} more from any species page.</p> : null}

      {/* Desktop: one column per species */}
      <div className="hidden md:block">
        <table className="w-full table-fixed border-collapse border border-rule text-[0.9375rem]">
          <caption className="sr-only">Comparison of {data.species.map(name).join(', ')}</caption>
          <thead>
            <tr>
              <td className="w-44 border-b border-rule lg:w-52" />
              {data.species.map((p) => (
                <th key={p.slug} scope="col" className="border-b border-l border-rule bg-panel p-5 text-left align-top font-normal">
                  <Link href={`/species/${p.slug}`} className="text-[clamp(1.375rem,2vw,1.75rem)] font-bold leading-tight tracking-[-0.02em] text-white decoration-lime decoration-2 underline-offset-[5px] hover:underline">{name(p)}</Link>
                  {p.commonName ? <div className="mt-2 italic text-muted">{p.scientificName}</div> : null}
                  <Link href={remove(p.slug)} className="btn btn-sm btn-quiet mt-4">Remove</Link>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ROWS.map((r) => (
              <Fragment key={r.key}>
                <tr className="align-top">
                  <th scope="row" className="border-b border-rule p-5 text-left text-sm font-semibold text-muted">{r.label}</th>
                  {data.species.map((p) => (
                    <td key={p.slug} className="border-b border-l border-rule p-5 text-fog">{r.cell(p)}</td>
                  ))}
                </tr>
                {r.key === 'population' ? (
                  <tr>
                    <td colSpan={data.species.length + 1} className="border-b border-rule p-0">{note}</td>
                  </tr>
                ) : null}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile: stacked, one card per species */}
      <div className="space-y-6 md:hidden">
        {note}
        {data.species.map((p) => (
          <section key={p.slug} aria-label={name(p)} className="panel p-5">
            <h2 className="text-2xl font-bold leading-tight tracking-[-0.02em] text-white">
              <Link href={`/species/${p.slug}`} className="decoration-lime decoration-2 underline-offset-[5px] hover:underline">{name(p)}</Link>
            </h2>
            {p.commonName ? <p className="mt-1 italic text-muted">{p.scientificName}</p> : null}
            <dl className="mt-5 border-t border-rule text-[0.9375rem]">
              {ROWS.map((r) => (
                <div key={r.key} className="border-b border-rule py-3">
                  <dt className="label">{r.label}</dt>
                  <dd className="mt-1.5 text-fog">{r.cell(p)}</dd>
                </div>
              ))}
            </dl>
            <Link href={remove(p.slug)} className="btn btn-sm btn-quiet mt-5 w-full">Remove from comparison</Link>
          </section>
        ))}
      </div>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <PageHeader
        kicker="Side by side"
        title="Compare species"
        lead="Up to three species, with no overall score. Figures with different units, places or dates are never combined."
      />
      <div className="wrap pt-10 md:pt-14">{children}</div>
    </div>
  );
}
