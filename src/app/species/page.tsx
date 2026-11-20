import type { Metadata } from 'next';
import Link from 'next/link';
import { FilterDrawer } from '@/components/explore/FilterDrawer';
import { SpeciesCard } from '@/components/SpeciesCard';
import type { components } from '@/contracts/api';
import { apiGet } from '@/lib/api';
import { apiQuery, appliedCount, type ExploreState, exploreHref, LIST_KEYS, type ListKey, readExplore } from '@/lib/explore-params';
import { IUCN_CATEGORIES, IUCN_LABEL } from '@/lib/iucn';
import { ENVIRONMENT_LABEL, GROUP_LABEL, TREND_LABEL } from '@/lib/labels';

export const metadata: Metadata = {
  title: 'Explore species',
  description: 'Search and filter species by animal group, environment, conservation status, place, habitat and trend.',
  alternates: { canonical: '/species' },
};

const PAGE_SIZE = 24;
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

export default async function ExplorePage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const state = readExplore(await searchParams);
  const [list, filters] = await Promise.all([
    apiGet('/api/v1/species', { query: apiQuery(state, PAGE_SIZE), tags: ['catalogue'] }).catch(() => null),
    apiGet('/api/v1/filters', { tags: ['catalogue'] }).catch(() => null),
  ]);
  const without = (key: ListKey, value: string): ExploreState => ({ ...state, [key]: state[key].filter((v) => v !== value), page: 1 });
  const chips = LIST_KEYS.flatMap((k) => state[k].map((v) => ({ key: k, value: v })));

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="text-3xl font-semibold">Explore species</h1>

      <form method="get" action="/species" role="search" aria-label="Search and filter species" className="mt-4 grid gap-6 md:grid-cols-[16rem_1fr]">
        {/* search + sort span the top */}
        <div className="flex flex-wrap items-end gap-3 md:col-span-2">
          <label className="min-w-0 flex-1 basis-56">
            <span className="text-sm font-medium">Search names</span>
            <input name="q" type="search" defaultValue={state.q} placeholder="Common or scientific name" className="mt-1 w-full rounded border border-line bg-white px-3 py-2" />
          </label>
          <label>
            <span className="text-sm font-medium">Sort by</span>
            <select name="sort" defaultValue={state.sort} className="mt-1 block rounded border border-line bg-white px-3 py-2">
              <option value="name">Name</option>
              <option value="status">Most threatened first</option>
              <option value="reviewed">Recently reviewed</option>
            </select>
          </label>
          <button className="rounded bg-forest px-4 py-2 text-paper hover:bg-forest-light">Search</button>
        </div>

        <div className="md:row-start-2">
          <FilterDrawer appliedCount={appliedCount(state) - (state.q ? 1 : 0)}>
            {filters ? (
              <div className="space-y-5">
                {LIST_KEYS.map((key) => {
                  const opts = options(filters, key, state[key]);
                  if (!opts.length) return null;
                  return (
                    <fieldset key={key}>
                      <legend className="font-semibold">{KEY_LABEL[key]}</legend>
                      <ul className={`mt-1 space-y-1 ${opts.length > 8 ? 'max-h-56 overflow-y-auto pr-1' : ''}`}>
                        {opts.map((o) => (
                          <li key={o.value}>
                            <label className="flex items-center gap-2 text-sm">
                              <input type="checkbox" name={key} value={o.value} defaultChecked={state[key].includes(o.value)} className="h-4 w-4 accent-forest" />
                              <span>{o.label}</span>
                              <span className="text-ink-muted">({o.count})</span>
                            </label>
                          </li>
                        ))}
                      </ul>
                    </fieldset>
                  );
                })}
                <button className="w-full rounded bg-forest px-4 py-2 text-paper hover:bg-forest-light">Apply filters</button>
              </div>
            ) : (
              <p className="text-sm text-ink-muted">Filters are unavailable right now.</p>
            )}
          </FilterDrawer>
        </div>

        <div className="md:col-start-2 md:row-start-2">
          {chips.length || state.q ? (
            <div className="mb-4 flex flex-wrap items-center gap-2" aria-label="Applied filters">
              {state.q ? (
                <Link href={exploreHref({ ...state, q: '', page: 1 })} className="rounded-full border border-forest px-3 py-1 text-sm text-forest hover:bg-paper-deep">
                  “{state.q}” <span aria-hidden>×</span><span className="sr-only">remove search</span>
                </Link>
              ) : null}
              {chips.map((c) => (
                <Link key={`${c.key}:${c.value}`} href={exploreHref(without(c.key, c.value))} className="rounded-full border border-forest px-3 py-1 text-sm text-forest hover:bg-paper-deep">
                  {KEY_LABEL[c.key]}: {labelFor(filters, c.key, c.value)} <span aria-hidden>×</span>
                  <span className="sr-only">remove this filter</span>
                </Link>
              ))}
              <Link href="/species" className="text-sm underline underline-offset-4">Reset all</Link>
            </div>
          ) : null}

          {list === null ? (
            <div role="alert" className="rounded border border-status-cr p-4">
              <p className="font-semibold">Species could not be loaded.</p>
              <p className="mt-1 text-sm">This is a problem on our side. <Link href={exploreHref(state)} className="underline">Try again</Link>.</p>
            </div>
          ) : list.items.length === 0 ? (
            <div className="rounded border border-line bg-white/60 p-6">
              <p className="font-semibold">No species match {chips.length || state.q ? 'these filters' : 'yet'}.</p>
              {chips.length || state.q ? (
                <p className="mt-1 text-sm">Try removing a filter, or <Link href="/species" className="underline">reset all filters</Link>.</p>
              ) : null}
            </div>
          ) : (
            <>
              <p className="mb-3 text-sm text-ink-muted" role="status">
                {list.total} {list.total === 1 ? 'species' : 'species'} in this catalogue match
              </p>
              <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {list.items.map((c) => (
                  <li key={c.slug}>
                    <SpeciesCard card={c} headingLevel="h2" />
                  </li>
                ))}
              </ul>
              {list.totalPages > 1 ? (
                <nav aria-label="Pages" className="mt-6 flex items-center justify-between text-sm">
                  {state.page > 1 ? <Link href={exploreHref({ ...state, page: state.page - 1 })} className="underline" rel="prev">Previous</Link> : <span />}
                  <span>Page {list.page} of {list.totalPages}</span>
                  {state.page < list.totalPages ? <Link href={exploreHref({ ...state, page: state.page + 1 })} className="underline" rel="next">Next</Link> : <span />}
                </nav>
              ) : null}
            </>
          )}
        </div>
      </form>
    </div>
  );
}

