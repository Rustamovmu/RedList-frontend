import type { Metadata } from 'next';
import Link from 'next/link';
import { FilterDrawer } from '@/components/explore/FilterDrawer';
import { type HeaderImage, PageHeader } from '@/components/PageHeader';
import { SearchIcon } from '@/components/shell/Icons';
import { Pagination } from '@/components/Pagination';
import { SpeciesCard } from '@/components/SpeciesCard';
import { STATUS_SWATCH } from '@/components/StatusBadge';
import type { components } from '@/contracts/api';
import { apiGet } from '@/lib/api';
import { apiQuery, appliedCount, type ExploreState, exploreHref, LIST_KEYS, type ListKey, readExplore } from '@/lib/explore-params';
import { IUCN_CATEGORIES, IUCN_LABEL, type IucnCategory } from '@/lib/iucn';
import { ENVIRONMENT_LABEL, GROUP_LABEL, TREND_LABEL } from '@/lib/labels';

export const metadata: Metadata = {
  title: 'Explore species',
  description: 'Search and filter species by animal group, environment, conservation status, place, habitat and trend.',
  alternates: { canonical: '/species' },
};

const PAGE_SIZE = 24;

/**
 * The header photo is the owner's choice; its credit and licence are still pending, and the caption says so (DECISIONS D-048).
 * The crop sits low (80%) so the animals, not the sky, fill the short band.
 */
const HEADER_IMAGE: HeaderImage = {
  src: '/hero/savanna.webp',
  alt: 'Savanna animals, among them an elephant, a giraffe, a lion, a zebra and a hippo, in front of a snow-capped mountain',
  position: 'object-[50%_80%]',
  caption: 'Header image: credit and licence pending',
};
type Filters = components['schemas']['FiltersDto'];
type Option = { value: string; label: string; count: number };

const KEY_LABEL: Record<ListKey, string> = {
  group: 'Animal group', environment: 'Environment', category: 'Status', region: 'Country or sea', habitat: 'Habitat', trend: 'Trend',
};

/** Options for one filter: everything with species in it, plus anything already selected (count 0 if nothing matches). */
function options(f: Filters, key: ListKey, selected: string[]): Option[] {
  const list: Option[] =
    key === 'group' ? f.groups.map((g) => ({ value: g.value, label: GROUP_LABEL[g.value as keyof typeof GROUP_LABEL] ?? g.value, count: g.count }))
    : key === 'environment' ? f.environments.map((e) => ({ value: e.value, label: ENVIRONMENT_LABEL[e.value] ?? e.value, count: e.count }))
    : key === 'category' ? IUCN_CATEGORIES.map((c) => ({ value: c, label: `${IUCN_LABEL[c]} (${c})`, count: f.categories.find((x) => x.value === c)?.count ?? 0 }))
    : key === 'trend' ? f.trends.map((t) => ({ value: t.value, label: TREND_LABEL[t.value] ?? t.value, count: t.count }))
    : key === 'region' ? f.regions.map((r) => ({ value: r.slug, label: r.name, count: r.count }))
    : f.habitats.map((h) => ({ value: h.code, label: h.name, count: h.count }));
  return list.filter((o) => o.count > 0 || selected.includes(o.value));
}

function labelFor(f: Filters | null, key: ListKey, value: string): string {
  if (!f) return value;
  return options(f, key, [value]).find((o) => o.value === value)?.label ?? value;
}

const CHIP = 'inline-flex min-h-9 items-center gap-2 border border-lime px-3 text-[0.8125rem] font-semibold text-lime hover:bg-lime hover:text-black';

export default async function ExplorePage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const state = readExplore(await searchParams);
  const [list, filters] = await Promise.all([
    apiGet('/api/v1/species', { query: apiQuery(state, PAGE_SIZE), tags: ['catalogue'] }).catch(() => null),
    apiGet('/api/v1/filters', { tags: ['catalogue'] }).catch(() => null),
  ]);
  const without = (key: ListKey, value: string): ExploreState => ({ ...state, [key]: state[key].filter((v) => v !== value), page: 1 });
  const chips = LIST_KEYS.flatMap((k) => state[k].map((v) => ({ key: k, value: v })));

  return (
    <form method="get" action="/species" role="search" aria-label="Search and filter species">
      <PageHeader
        kicker="Catalogue"
        title="Explore species"
        image={HEADER_IMAGE}
        lead={
          <>
            {filters ? <><strong>{filters.total} species</strong> in this catalogue. </> : null}
            Search by name, or filter by group, environment, status, place, habitat and trend.
          </>
        }
      >
        <div className="mt-8 grid max-w-[64rem] gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
          <div className="searchbox h-14">
            <label htmlFor="explore-q" className="sr-only">Search names</label>
            <input id="explore-q" name="q" type="search" defaultValue={state.q} placeholder="Common or scientific name" />
            <button type="submit">
              <span className="sr-only">Search</span>
              <SearchIcon />
            </button>
          </div>
          <label className="flex items-center gap-3">
            <span className="shrink-0 text-sm font-semibold text-fog">Sort by</span>
            <select name="sort" defaultValue={state.sort} className="field h-14 min-w-0 flex-1 bg-black text-[0.9375rem] font-medium sm:w-56 sm:flex-none">
              <option value="name">Name</option>
              <option value="status">Most threatened first</option>
              <option value="reviewed">Recently reviewed</option>
            </select>
          </label>
        </div>
      </PageHeader>

      <div className="wrap grid gap-x-12 gap-y-8 pt-10 md:grid-cols-[15rem_minmax(0,1fr)] md:pt-14 lg:grid-cols-[17rem_minmax(0,1fr)]">
        <div>
          <FilterDrawer appliedCount={appliedCount(state) - (state.q ? 1 : 0)}>
            {filters ? (
              <div>
                {LIST_KEYS.map((key) => {
                  const opts = options(filters, key, state[key]);
                  if (!opts.length) return null;
                  return (
                    <div key={key} className="border-t border-rule py-5 first:border-t-0 first:pt-0">
                      <fieldset>
                        <legend className="text-[0.9375rem] font-bold text-white">{KEY_LABEL[key]}</legend>
                        <ul className={`mt-3 space-y-0.5 ${opts.length > 8 ? 'max-h-60 overflow-y-auto border border-rule p-2' : ''}`}>
                          {opts.map((o) => (
                            <li key={o.value}>
                              <label className="flex min-h-9 cursor-pointer items-center gap-3 text-[0.9375rem] text-fog hover:text-white">
                                <input type="checkbox" name={key} value={o.value} defaultChecked={state[key].includes(o.value)} className="h-4 w-4 shrink-0 accent-lime" />
                                {key === 'category' ? <span aria-hidden className={`h-2.5 w-2.5 shrink-0 ${STATUS_SWATCH[o.value as IucnCategory]}`} /> : null}
                                <span>{o.label}</span>
                                <span className="figures ml-auto text-[0.8125rem] text-muted">{o.count}</span>
                              </label>
                            </li>
                          ))}
                        </ul>
                      </fieldset>
                    </div>
                  );
                })}
                <div className="sticky bottom-0 -mx-5 border-t border-rule bg-black px-5 py-4 md:mx-0 md:px-0">
                  <button className="btn btn-primary w-full">Apply filters</button>
                </div>
              </div>
            ) : (
              <p className="missing text-sm">Filters are unavailable right now.</p>
            )}
          </FilterDrawer>
        </div>

        <div className="min-w-0">
          {chips.length || state.q ? (
            <div className="mb-5 flex flex-wrap items-center gap-2" aria-label="Applied filters">
              {state.q ? (
                <Link href={exploreHref({ ...state, q: '', page: 1 })} className={CHIP}>
                  “{state.q}” <span aria-hidden>×</span><span className="sr-only">remove search</span>
                </Link>
              ) : null}
              {chips.map((c) => (
                <Link key={`${c.key}:${c.value}`} href={exploreHref(without(c.key, c.value))} className={CHIP}>
                  {KEY_LABEL[c.key]}: {labelFor(filters, c.key, c.value)} <span aria-hidden>×</span>
                  <span className="sr-only">remove this filter</span>
                </Link>
              ))}
              <Link href="/species" className="ml-2 inline-flex min-h-9 items-center text-sm font-semibold text-fog underline underline-offset-4 hover:text-lime">Reset all</Link>
            </div>
          ) : null}

          {list === null ? (
            <div role="alert" className="notice-error">
              <p className="font-bold">Species could not be loaded.</p>
              <p className="mt-1 text-sm">This is a problem on our side. <Link href={exploreHref(state)} className="underline underline-offset-4">Try again</Link>.</p>
            </div>
          ) : list.items.length === 0 ? (
            <div className="panel px-6 py-10">
              <p className="text-xl font-bold text-white">No species match {chips.length || state.q ? 'these filters' : 'yet'}.</p>
              {chips.length || state.q ? (
                <p className="mt-2 text-fog">Try removing a filter, or <Link href="/species" className="link">reset all filters</Link>.</p>
              ) : null}
            </div>
          ) : (
            <>
              <p className="mb-6 text-[0.9375rem] font-semibold text-fog" role="status">
                {list.total} species in this catalogue match
              </p>
              <ul className="grid gap-x-6 gap-y-12 sm:grid-cols-2 md:grid-cols-1 lg:grid-cols-2 xl:grid-cols-3">
                {list.items.map((c, i) => (
                  <li key={c.slug}>
                    <SpeciesCard card={c} headingLevel="h2" eager={i < 3} />
                  </li>
                ))}
              </ul>
              <Pagination page={list.page} totalPages={list.totalPages} href={(page) => exploreHref({ ...state, page })} />
            </>
          )}
        </div>
      </div>
    </form>
  );
}
