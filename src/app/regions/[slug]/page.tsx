import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { SpeciesCard } from '@/components/SpeciesCard';
import type { components } from '@/contracts/api';
import { ApiError, apiGet } from '@/lib/api';
import { IUCN_LABEL } from '@/lib/iucn';
import { GROUP_LABEL, ORIGIN_LABEL, PRESENCE_LABEL, SEASON_LABEL } from '@/lib/labels';

type RegionPage = components['schemas']['RegionPageDto'];
type Raw = Record<string, string | string[] | undefined>;
type Props = { params: Promise<{ slug: string }>; searchParams: Promise<Raw> };

const KEYS = ['group', 'category', 'origin', 'seasonality'] as const;
type Key = (typeof KEYS)[number];
const KEY_LABEL: Record<Key, string> = { group: 'Animal group', category: 'Status', origin: 'Origin here', seasonality: 'Season here' };
const TYPE_LABEL: Record<string, string> = { country: 'Country', ocean: 'Ocean', sea: 'Sea', other: 'Marine area' };
const PAGE_SIZE = 24;

const list = (v: string | string[] | undefined) =>
  [...new Set((Array.isArray(v) ? v : v ? [v] : []).flatMap((x) => x.split(',')).map((x) => x.trim()).filter(Boolean))].slice(0, 11);

function readState(raw: Raw) {
  const pageRaw = Number(Array.isArray(raw.page) ? raw.page[0] : raw.page);
  return {
    group: list(raw.group), category: list(raw.category), origin: list(raw.origin), seasonality: list(raw.seasonality),
    page: Number.isInteger(pageRaw) && pageRaw > 0 && pageRaw <= 1000 ? pageRaw : 1,
  };
}
type State = ReturnType<typeof readState>;

function href(slug: string, s: State): string {
  const p = new URLSearchParams();
  for (const k of KEYS) for (const v of s[k]) p.append(k, v);
  if (s.page > 1) p.set('page', String(s.page));
  const qs = p.toString();
  return `/regions/${slug}${qs ? `?${qs}` : ''}`;
}

async function load(slug: string, s: State): Promise<RegionPage> {
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)) notFound();
  try {
    return await apiGet('/api/v1/regions/{slug}', {
      params: { slug },
      query: {
        group: s.group.join(',') || undefined, category: s.category.join(',') || undefined, origin: s.origin.join(',') || undefined,
        seasonality: s.seasonality.join(',') || undefined, page: String(s.page), pageSize: String(PAGE_SIZE),
      },
      tags: [`region:${slug}`, 'catalogue'],
    });
  } catch (e) {
    if (e instanceof ApiError && (e.status === 404 || e.status === 400)) notFound();
    throw e;
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const r = await load(slug, readState({}));
  return {
    title: `${r.region.name}: species`,
    description: `Species in this catalogue recorded in ${r.region.name}, with how they occur there.`,
    alternates: { canonical: `/regions/${slug}` },
  };
}

function label(key: Key, value: string): string {
  if (key === 'group') return GROUP_LABEL[value as keyof typeof GROUP_LABEL] ?? value;
  if (key === 'category') return `${IUCN_LABEL[value as keyof typeof IUCN_LABEL] ?? value} (${value})`;
  if (key === 'origin') return ORIGIN_LABEL[value] ?? value;
  return SEASON_LABEL[value] ?? value;
}

export default async function RegionPageView({ params, searchParams }: Props) {
  const { slug } = await params;
  const state = readState(await searchParams);
  const r = await load(slug, state);
  const facets: Record<Key, Array<{ value: string; count: number }>> = {
    group: r.facets.groups, category: r.facets.categories, origin: r.facets.origins, seasonality: r.facets.seasonalities,
  };
  const applied = KEYS.reduce((n, k) => n + state[k].length, 0);
  const anySpecies = r.facets.groups.some((g) => g.count > 0);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <p className="text-sm font-medium uppercase tracking-wider text-forest-light">{TYPE_LABEL[r.region.type] ?? r.region.type}</p>
      <h1 className="mt-1 text-3xl font-semibold">{r.region.name}</h1>
      <p className="mt-2 max-w-3xl text-ink-muted">
        Species in this catalogue recorded in {r.region.name}, with how they occur here as their sources record it. This is not a complete list of the
        wildlife of {r.region.name}. Species whose locations are withheld for their protection are never listed by place.
      </p>
      <p className="mt-2 flex flex-wrap gap-x-4 text-sm">
        {r.region.bbox ? (
          <Link href={`/map?bbox=${r.region.bbox.join(',')}`} className="underline underline-offset-4">View on the map</Link>
        ) : null}
        {r.region.source ? <span className="text-ink-muted">Boundary: {r.region.source.title} ({r.region.source.license ?? 'licence not recorded'})</span> : null}
      </p>

      {anySpecies ? (
        <form method="get" action={`/regions/${slug}`} className="mt-6" aria-label={`Filter species in ${r.region.name}`}>
          <details className="rounded border border-line bg-white/60 p-3" open={applied > 0}>
            <summary className="cursor-pointer font-medium">Filters{applied ? ` (${applied} applied)` : ''}</summary>
            <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {KEYS.map((k) => {
                const opts = facets[k].filter((o) => o.count > 0 || state[k].includes(o.value));
                if (!opts.length) return null;
                return (
                  <fieldset key={k}>
                    <legend className="font-semibold">{KEY_LABEL[k]}</legend>
                    <ul className="mt-1 space-y-1">
                      {opts.map((o) => (
                        <li key={o.value}>
                          <label className="flex items-center gap-2 text-sm">
                            <input type="checkbox" name={k} value={o.value} defaultChecked={state[k].includes(o.value)} className="h-4 w-4 accent-forest" />
                            <span>{label(k, o.value)}</span>
                            <span className="text-ink-muted">({o.count})</span>
                          </label>
                        </li>
                      ))}
                    </ul>
                  </fieldset>
                );
              })}
            </div>
            <div className="mt-3 flex flex-wrap gap-3">
              <button className="rounded bg-forest px-4 py-2 text-paper hover:bg-forest-light">Apply filters</button>
              {applied ? <Link href={`/regions/${slug}`} className="self-center text-sm underline underline-offset-4">Reset all</Link> : null}
            </div>
          </details>
        </form>
      ) : null}

      <section aria-labelledby="species-h" className="mt-6">
        <h2 id="species-h" className="sr-only">Species</h2>
        {r.items.length === 0 ? (
          <p className="rounded border border-line bg-white/60 p-6">
            {applied ? (
              <>No species here match these filters. <Link href={`/regions/${slug}`} className="underline">Reset all filters</Link>.</>
            ) : (
              <>No species in this catalogue are recorded in {r.region.name} yet.</>
            )}
          </p>
        ) : (
          <>
            <p role="status" className="mb-3 text-sm text-ink-muted">
              {r.total} species in this catalogue recorded here{applied ? ' match' : ''}
            </p>
            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {r.items.map((i) => (
                <li key={i.card.slug} className="flex flex-col">
                  <SpeciesCard card={i.card} headingLevel="h3" />
                  <ul className="mt-1 text-sm text-ink-muted" aria-label={`How ${i.card.commonName ?? i.card.scientificName} occurs here`}>
                    {i.occurrences.map((o, n) => (
                      <li key={n}>
                        {PRESENCE_LABEL[o.presence]} · {ORIGIN_LABEL[o.origin]} · {SEASON_LABEL[o.seasonality]}
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
            {r.totalPages > 1 ? (
              <nav aria-label="Pages" className="mt-6 flex items-center justify-between text-sm">
                {state.page > 1 ? <Link href={href(slug, { ...state, page: state.page - 1 })} className="underline" rel="prev">Previous</Link> : <span />}
                <span>Page {r.page} of {r.totalPages}</span>
                {state.page < r.totalPages ? <Link href={href(slug, { ...state, page: state.page + 1 })} className="underline" rel="next">Next</Link> : <span />}
              </nav>
            ) : null}
          </>
        )}
      </section>
    </div>
  );
}
