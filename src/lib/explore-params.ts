/**
 * Explore state lives in the URL (PLAN §4): filters, sort and page. These helpers read it from Next's
 * searchParams and build links that add or remove one value, so Back/Forward and shared links just work.
 */
export const LIST_KEYS = ['group', 'environment', 'category', 'region', 'habitat', 'trend'] as const;
export type ListKey = (typeof LIST_KEYS)[number];
export type ExploreState = { q: string; sort: 'name' | 'status' | 'reviewed'; page: number } & Record<ListKey, string[]>;

type Raw = Record<string, string | string[] | undefined>;

const values = (v: string | string[] | undefined) =>
  [...new Set((Array.isArray(v) ? v : v ? [v] : []).flatMap((x) => x.split(',')).map((x) => x.trim()).filter(Boolean))].slice(0, 20);

export function readExplore(raw: Raw): ExploreState {
  const sortRaw = Array.isArray(raw.sort) ? raw.sort[0] : raw.sort;
  const pageRaw = Number(Array.isArray(raw.page) ? raw.page[0] : raw.page);
  const qRaw = Array.isArray(raw.q) ? raw.q[0] : raw.q;
  const state = {
    q: (qRaw ?? '').slice(0, 100),
    sort: sortRaw === 'status' || sortRaw === 'reviewed' ? sortRaw : 'name',
    page: Number.isInteger(pageRaw) && pageRaw > 0 && pageRaw <= 1000 ? pageRaw : 1,
  } as ExploreState;
  for (const k of LIST_KEYS) state[k] = values(raw[k]);
  return state;
}

/** The URL for a state. Repeated keys (group=a&group=b) match what a GET form submits. */
export function exploreHref(s: ExploreState): string {
  const p = new URLSearchParams();
  if (s.q) p.set('q', s.q);
  for (const k of LIST_KEYS) for (const v of s[k]) p.append(k, v);
  if (s.sort !== 'name') p.set('sort', s.sort);
  if (s.page > 1) p.set('page', String(s.page));
  const qs = p.toString();
  return qs ? `/species?${qs}` : '/species';
}

/** API query: comma-separated values, as GET /api/v1/species expects. */
export function apiQuery(s: ExploreState, pageSize: number): Record<string, string | undefined> {
  const q: Record<string, string | undefined> = { q: s.q || undefined, sort: s.sort, page: String(s.page), pageSize: String(pageSize) };
  for (const k of LIST_KEYS) q[k] = s[k].length ? s[k].join(',') : undefined;
  return q;
}

export const appliedCount = (s: ExploreState) => LIST_KEYS.reduce((n, k) => n + s[k].length, 0) + (s.q ? 1 : 0);

/**
 * True when a filter cannot narrow the list, so the page leaves it out (D-059): it has a single option, that option
 * matches every species the page covers (`total`), and it is not selected. A selected option always stays, so it can be
 * unticked. Example: "Trend unknown (81)" while every species' trend is unknown.
 */
export function onlyOneChoice(options: ReadonlyArray<{ value: string; count: number }>, total: number, selected: readonly string[]): boolean {
  const [only] = options;
  return options.length === 1 && only !== undefined && only.count === total && !selected.includes(only.value);
}
