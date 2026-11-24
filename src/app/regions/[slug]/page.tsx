import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { PageHeader } from '@/components/PageHeader';
import { Pagination } from '@/components/Pagination';
import { SpeciesCard } from '@/components/SpeciesCard';
import type { components } from '@/contracts/api';
import { ApiError, apiGet } from '@/lib/api';
import { onlyOneChoice } from '@/lib/explore-params';
import { IUCN_LABEL } from '@/lib/iucn';
import { GROUP_LABEL, ORIGIN_LABEL, PRESENCE_LABEL, REGION_TYPE_LABEL, SEASON_LABEL } from '@/lib/labels';

type RegionPage = components['schemas']['RegionPageDto'];
type Raw = Record<string, string | string[] | undefined>;
type Props = { params: Promise<{ slug: string }>; searchParams: Promise<Raw> };

const KEYS = ['group', 'category', 'origin', 'seasonality'] as const;
type Key = (typeof KEYS)[number];
const KEY_LABEL: Record<Key, string> = { group: 'Animal group', category: 'Status', origin: 'Origin here', seasonality: 'Season here' };
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
  // The facets count the whole region, whatever is filtered, and every species has exactly one group, so the group
  // counts add up to the region's species. A filter that cannot narrow that list is left out (D-059).
  const regionTotal = r.facets.groups.reduce((n, g) => n + g.count, 0);
  const shown = KEYS.map((k) => ({ k, opts: facets[k].filter((o) => o.count > 0 || state[k].includes(o.value)) })).filter(
    ({ k, opts }) => opts.length > 0 && !onlyOneChoice(opts, regionTotal, state[k]),
  );

  return (
    <div>
      <PageHeader
        kicker={REGION_TYPE_LABEL[r.region.type] ?? r.region.type}
        title={r.region.name}
        lead={
          <>
            Species in this catalogue recorded in {r.region.name}, with <strong>how they occur here</strong> as their sources record it. This is not a complete list of the
            wildlife of {r.region.name}. Species whose locations are withheld for their protection are never listed by place.
          </>
        }
      >
        <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3">
          {r.region.bbox ? (
            <Link href={`/map?bbox=${r.region.bbox.join(',')}`} className="btn btn-primary go">View on the map</Link>
          ) : null}
          {r.region.source ? <span className="meta">Boundary: {r.region.source.title} ({r.region.source.license ?? 'licence not recorded'})</span> : null}
        </div>
      </PageHeader>

      <div className="wrap">
        {shown.length ? (
          <form method="get" action={`/regions/${slug}`} className="mt-10" aria-label={`Filter species in ${r.region.name}`}>
            <details className="disclosure border border-rule bg-panel" open={applied > 0}>
              <summary className="flex min-h-14 items-center px-5 text-base font-bold text-white">
                <span>Filters{applied ? ` (${applied} applied)` : ''}</span>
              </summary>
              <div className="grid gap-8 border-t border-rule px-5 pt-5 sm:grid-cols-2 lg:grid-cols-4">
                {shown.map(({ k, opts }) => {
                  return (
                    <fieldset key={k}>
                      <legend className="text-[0.9375rem] font-bold text-white">{KEY_LABEL[k]}</legend>
                      <ul className="mt-3 space-y-0.5">
                        {opts.map((o) => (
                          <li key={o.value}>
                            <label className="flex min-h-9 cursor-pointer items-center gap-3 text-[0.9375rem] text-fog hover:text-white">
                              <input type="checkbox" name={k} value={o.value} defaultChecked={state[k].includes(o.value)} className="h-4 w-4 shrink-0 accent-lime" />
                              <span>{label(k, o.value)}</span>
                              <span className="figures ml-auto text-[0.8125rem] text-muted">{o.count}</span>
                            </label>
                          </li>
                        ))}
                      </ul>
                    </fieldset>
                  );
                })}
              </div>
              <div className="flex flex-wrap items-center gap-5 px-5 pt-6 pb-5">
                <button className="btn btn-primary">Apply filters</button>
                {applied ? <Link href={`/regions/${slug}`} className="text-sm font-semibold underline underline-offset-4 hover:text-lime">Reset all</Link> : null}
              </div>
            </details>
          </form>
        ) : null}

        <section aria-labelledby="species-h" className="mt-10">
          <h2 id="species-h" className="sr-only">Species</h2>
          {r.items.length === 0 ? (
            <p className="panel px-6 py-10 text-lg text-white">
              {applied ? (
                <>No species here match these filters. <Link href={`/regions/${slug}`} className="link">Reset all filters</Link>.</>
              ) : (
                <>No species in this catalogue are recorded in {r.region.name} yet.</>
              )}
            </p>
          ) : (
            <>
              <p role="status" className="mb-6 text-[0.9375rem] font-semibold text-fog">
                {r.total} species in this catalogue recorded here{applied ? ' match' : ''}
              </p>
              <ul className="grid gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
                {r.items.map((i) => (
                  <li key={i.card.slug} className="flex flex-col">
                    <SpeciesCard card={i.card} headingLevel="h3" />
                    <ul className="mt-3 space-y-1 border-t border-rule pt-3 text-[0.8125rem] text-muted" aria-label={`How ${i.card.commonName ?? i.card.scientificName} occurs here`}>
                      {i.occurrences.map((o, n) => (
                        <li key={n} className="before:mr-2 before:text-lime before:content-['▸']">
                          {PRESENCE_LABEL[o.presence]} · {ORIGIN_LABEL[o.origin]} · {SEASON_LABEL[o.seasonality]}
                        </li>
                      ))}
                    </ul>
                  </li>
                ))}
              </ul>
              <Pagination page={r.page} totalPages={r.totalPages} href={(page) => href(slug, { ...state, page })} />
            </>
          )}
        </section>
      </div>
    </div>
  );
}
