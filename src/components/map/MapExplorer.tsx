'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { SpeciesRow } from '@/components/SpeciesRow';
import type { components } from '@/contracts/api';
import { REGION_TYPE_LABEL } from '@/lib/labels';
import { type Bbox, bboxParam, containsPoint, WORLD } from './geo';
import { MapLegend } from './MapLegend';
import type { Basemap, MapPick } from './WorldMap';

type MapDto = components['schemas']['MapDto'];
type Option = { value: string; label: string; count: number };

// MapLibre loads only in the browser, after the list has rendered (PLAN §11: the map never blocks the list).
const WorldMap = dynamic(() => import('./WorldMap'), {
  ssr: false,
  loading: () => <p className="p-4 text-sm text-muted">Loading the map…</p>,
});

const LAYER_LABEL = { range: 'Published range map', country: 'Country-level presence' } as const;
/** Below lg the list runs under the map, so it starts with this many rows and a "Show all" button (D-059). */
const FIRST_ROWS = 12;

/** Whether a picked place or range is still on the map after new data (a pan can move it out of view). */
function stillShown(p: MapPick, d: MapDto): boolean {
  return p.kind === 'region' ? d.countryPresence.some((c) => c.slug === p.slug) : d.ranges.some((r) => r.speciesSlug === p.species);
}

/**
 * /map: filters, the map and a results list kept in sync. The list is the accessible equivalent of the map.
 * The map is interactive (D-060): selecting a shaded place narrows the list to its species, and pointing at (or
 * focusing) a species in the list outlines its places on the map.
 */
export function MapExplorer({
  initial,
  initialBbox,
  group,
  category,
  groupOptions,
  categoryOptions,
}: {
  initial: MapDto | null;
  initialBbox: Bbox | null;
  group: string[];
  category: string[];
  groupOptions: Option[];
  categoryOptions: Option[];
}) {
  const router = useRouter();
  const [data, setData] = useState<MapDto | null>(initial);
  const [bbox, setBbox] = useState<Bbox>(initialBbox ?? WORLD);
  const [listFailed, setListFailed] = useState(initial === null);
  const [mapFailed, setMapFailed] = useState(false);
  const [basemap, setBasemap] = useState<Basemap | null>(null);
  const [nearMessage, setNearMessage] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);
  const [picked, setPicked] = useState<MapPick | null>(null);
  const [linked, setLinked] = useState<string | null>(null);
  const request = useRef(0);
  const listRef = useRef<HTMLUListElement>(null);

  /** Reveal the rest of the list on small screens and move focus to the first row that was hidden. */
  function revealAll() {
    flushSync(() => setShowAll(true));
    listRef.current?.children[FIRST_ROWS]?.querySelector('a')?.focus();
  }

  const load = useCallback(
    async (b: Bbox) => {
      const id = ++request.current;
      const qs = new URLSearchParams({ bbox: bboxParam(b) });
      if (group.length) qs.set('group', group.join(','));
      if (category.length) qs.set('category', category.join(','));
      try {
        const res = await fetch(`/api/v1/map?${qs}`, { headers: { accept: 'application/json' } });
        if (!res.ok) throw new Error(String(res.status));
        const json = (await res.json()) as MapDto;
        if (id === request.current) {
          setData(json);
          setListFailed(false);
          setPicked((p) => (p && !stillShown(p, json) ? null : p));
        }
      } catch {
        if (id === request.current) setListFailed(true);
      }
    },
    [group, category],
  );

  const onMove = useCallback(
    (view: Bbox) => {
      // A view that spans every longitude is the world view. Its cut at 60° S is only for the picture (D-060), so the
      // list still covers the whole world, Antarctica included.
      const b: Bbox = view[0] === -180 && view[2] === 180 ? WORLD : view;
      setBbox(b);
      // Keep the view in the URL without filling the Back history with every pan.
      const url = new URL(window.location.href);
      url.searchParams.set('bbox', bboxParam(b));
      window.history.replaceState(window.history.state, '', url);
      void load(b);
    },
    [load],
  );

  const onFail = useCallback(() => setMapFailed(true), []);

  function nearMe() {
    setNearMessage(null);
    if (!basemap || !('geolocation' in navigator)) {
      setNearMessage('Your browser cannot share a location here.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        // Matched against the map's own country shapes, in this browser. The position is never sent anywhere.
        const { longitude, latitude } = pos.coords;
        const hit = basemap.features.find((f) => f.properties.kind === 'country' && containsPoint(f.geometry.coordinates, longitude, latitude));
        if (hit) router.push(`/regions/${hit.properties.slug}`);
        else setNearMessage('Your location does not fall inside a country on our map (small islands and the open sea are not included).');
      },
      () => setNearMessage('No location was shared, so nothing was filtered.'),
      { maximumAge: 600_000, timeout: 10_000 },
    );
  }

  const applied = group.length + category.length;
  const species = data?.species ?? [];
  // The selection narrows the list to the species recorded in the picked place, or to the species of a picked range.
  const place = picked?.kind === 'region' ? (data?.countryPresence.find((c) => c.slug === picked.slug) ?? null) : null;
  const rangeSpecies = picked?.kind === 'range' ? (species.find((s) => s.slug === picked.species) ?? null) : null;
  const only = picked ? new Set(picked.kind === 'region' ? (place?.species ?? []) : [picked.species]) : null;
  const shown = only ? species.filter((s) => only.has(s.slug)) : species;

  return (
    <>
      <form method="get" action="/map" className="mt-10" aria-label="Filter the map">
        <details className="disclosure border border-rule bg-panel" open={applied > 0}>
          <summary className="flex min-h-14 items-center px-5 text-base font-bold text-white">
            <span>Filters{applied ? ` (${applied} applied)` : ''}</span>
          </summary>
          <div className="grid gap-8 border-t border-rule px-5 pt-5 sm:grid-cols-2">
            {[
              { key: 'group', legend: 'Animal group', options: groupOptions, selected: group },
              { key: 'category', legend: 'Status', options: categoryOptions, selected: category },
            ].map((f) => (
              <fieldset key={f.key}>
                <legend className="text-[0.9375rem] font-bold text-white">{f.legend}</legend>
                <ul className="mt-3 space-y-0.5">
                  {f.options.map((o) => (
                    <li key={o.value}>
                      <label className="flex min-h-9 cursor-pointer items-center gap-3 text-[0.9375rem] text-fog hover:text-white">
                        <input type="checkbox" name={f.key} value={o.value} defaultChecked={f.selected.includes(o.value)} className="h-4 w-4 accent-lime" />
                        <span>{o.label}</span>
                      </label>
                    </li>
                  ))}
                </ul>
              </fieldset>
            ))}
          </div>
          <input type="hidden" name="bbox" value={bboxParam(bbox)} />
          <div className="flex flex-wrap items-center gap-5 px-5 pt-6 pb-5">
            <button className="btn btn-primary">Apply filters</button>
            {applied ? <a href="/map" className="text-sm font-semibold underline underline-offset-4 hover:text-lime">Reset all</a> : null}
          </div>
        </details>
      </form>

      {/* On large screens the list scrolls inside its own box, exactly as tall as the map column (the box is taken out of
          the flow, so the map column sets the row height). The page stays short: the footer is one scroll away instead
          of below every card, and when the list reaches its end the wheel carries on to the page. Phones keep one flow. */}
      {/* From lg the map is 3:2, the shape of the world view (84° N to 60° S, Antarctica cut, D-060), so the world fills it
          edge to edge and the page above and below stays free for scrolling. It never grows taller than the window under
          the sticky nav. Phones keep a shorter map, so one-finger scrolling is not trapped by it. */}
      <div className="mt-6 grid gap-x-8 gap-y-12 lg:grid-cols-[minmax(0,1fr)_24rem] xl:grid-cols-[minmax(0,1fr)_28rem]">
        <div className="min-w-0">
          <div className="relative h-[55vh] min-h-72 overflow-hidden border border-rule bg-panel lg:aspect-[3/2] lg:h-auto lg:max-h-[calc(100svh-var(--nav-h)-2.5rem)] lg:min-h-[28rem] lg:w-full">
            {mapFailed ? (
              <p role="status" className="notice m-4 text-[0.9375rem] text-fog">
                <strong className="text-white">The map could not be loaded.</strong> The list still works: it shows every species for the area and filters you chose.
              </p>
            ) : (
              <>
                <WorldMap
                  data={data}
                  fit={initialBbox}
                  onMove={onMove}
                  onFail={onFail}
                  onBasemap={setBasemap}
                  label="Map of the species in the list. The list has the same information."
                  interactive
                  picked={picked}
                  onPick={setPicked}
                  linkedSpecies={linked}
                />
                {/* The selected place or range, in the map's top left corner (the zoom buttons are top right). */}
                {picked ? (
                  <div data-testid="map-selection" className="absolute top-3 left-3 z-10 w-[min(21rem,calc(100%-4.5rem))] border border-rule bg-black py-3.5 pr-12 pl-4">
                    <p className="kicker">{picked.kind === 'region' ? (REGION_TYPE_LABEL[picked.regionType] ?? 'Place') : 'Published range map'}</p>
                    <p className="mt-1 text-lg font-bold leading-snug text-white">
                      {picked.kind === 'region' ? picked.name : (rangeSpecies?.commonName ?? rangeSpecies?.scientificName ?? picked.species)}
                    </p>
                    {picked.kind === 'region' ? (
                      <p className="mt-0.5 text-sm text-fog">
                        <span className="figures">{shown.length}</span> species in this view
                      </p>
                    ) : null}
                    {picked.kind === 'region' ? (
                      <Link href={`/regions/${picked.slug}`} className="more mt-1">Open the page for {picked.name}</Link>
                    ) : (
                      <Link href={`/species/${picked.species}`} className="more mt-1">Open the profile</Link>
                    )}
                    <button
                      type="button"
                      onClick={() => setPicked(null)}
                      className="absolute top-1.5 right-1.5 inline-flex h-11 w-11 items-center justify-center text-2xl leading-none text-fog hover:text-lime"
                    >
                      <span aria-hidden>×</span>
                      <span className="sr-only">Clear the selection and list every species in this view</span>
                    </button>
                  </div>
                ) : null}
              </>
            )}
          </div>
          <div className="mt-5 flex flex-wrap items-start justify-between gap-x-8 gap-y-6">
            <div className="max-w-xl">
              <MapLegend counts />
              {mapFailed ? null : (
                <p className="mt-3 text-[0.8125rem] leading-relaxed text-muted">
                  Select a shaded place to list only its species. Pointing at a species in the list outlines where it is recorded.
                  Zoom with Ctrl + scroll (or ⌘ on a Mac), the + and − buttons, or two fingers on a touch screen.
                </p>
              )}
            </div>
            <div className="max-w-xs">
              <button
                type="button"
                onClick={nearMe}
                disabled={!basemap}
                className="btn btn-sm btn-soft"
              >
                Near me
              </button>
              <p className="mt-2 text-[0.8125rem] leading-relaxed text-muted">Finds your country in this browser only. Your position is never sent to us.</p>
              {nearMessage ? <p className="mt-2 text-sm text-white">{nearMessage}</p> : null}
            </div>
          </div>
        </div>

        <section aria-labelledby="results-h" className="min-w-0 lg:relative">
          <div className="lg:absolute lg:inset-0 lg:flex lg:flex-col">
            <h2 id="results-h" className="text-xl font-bold tracking-[-0.02em] text-white">Species in this view</h2>
            {listFailed ? (
              <p role="alert" className="notice-error mt-3 text-sm">Species could not be loaded. This is a problem on our side; please try again.</p>
            ) : (
              <>
                <div className="mt-2 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                  <p role="status" className="meta" data-testid="map-count">
                    {picked?.kind === 'region'
                      ? `${shown.length} of ${species.length} species in this view are recorded in ${picked.name}`
                      : picked?.kind === 'range'
                        ? `${shown.length} of ${species.length} species in this view: the one with this published range map`
                        : `${species.length} species in this catalogue match this view${data?.truncated ? '. Zoom in to see all of them.' : ''}`}
                  </p>
                  {picked ? (
                    <button type="button" onClick={() => setPicked(null)} className="inline-flex min-h-9 items-center text-sm font-semibold text-fog underline underline-offset-4 hover:text-lime">
                      Show all {species.length}
                    </button>
                  ) : null}
                </div>
                {shown.length === 0 ? (
                  <p className="missing mt-4">No species here match these filters. Move the map or remove a filter.</p>
                ) : (
                  <>
                    {/* Compact rows (D-059). On lg the box scrolls on its own; the side padding (pulled back by -ml-2) keeps
                        the focus outline of a row inside the scroll box, where it would otherwise be clipped.
                        Pointing at or focusing a row outlines that species' places on the map (D-060). */}
                    <ul
                      ref={listRef}
                      data-testid="map-results"
                      className="mt-6 grid lg:-ml-2 lg:min-h-0 lg:flex-1 lg:grid-cols-1 lg:content-start lg:overflow-y-auto lg:pr-3 lg:pl-2 lg:[scrollbar-color:var(--color-rule)_transparent] lg:[scrollbar-width:thin]"
                      onMouseLeave={() => setLinked(null)}
                    >
                      {shown.map((s, i) => (
                        <li
                          key={s.slug}
                          className={`border-t border-rule py-4 ${i >= FIRST_ROWS && !showAll ? 'max-lg:hidden' : ''}`}
                          onMouseEnter={() => setLinked(s.slug)}
                          onFocus={() => setLinked(s.slug)}
                          onBlur={() => setLinked(null)}
                        >
                          <SpeciesRow card={s} note={`Shown on the map as: ${LAYER_LABEL[s.layer]}`} />
                        </li>
                      ))}
                    </ul>
                    {shown.length > FIRST_ROWS && !showAll ? (
                      <button type="button" onClick={revealAll} className="btn btn-soft mt-6 w-full lg:hidden">
                        Show all {shown.length} species
                      </button>
                    ) : null}
                  </>
                )}
              </>
            )}
          </div>
        </section>
      </div>
    </>
  );
}
