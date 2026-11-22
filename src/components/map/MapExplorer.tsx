'use client';

import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { useCallback, useRef, useState } from 'react';
import { SpeciesCard } from '@/components/SpeciesCard';
import type { components } from '@/contracts/api';
import { type Bbox, bboxParam, containsPoint, WORLD } from './geo';
import { MapLegend } from './MapLegend';
import type { Basemap } from './WorldMap';

type MapDto = components['schemas']['MapDto'];
type Option = { value: string; label: string; count: number };

// MapLibre loads only in the browser, after the list has rendered (PLAN §11: the map never blocks the list).
const WorldMap = dynamic(() => import('./WorldMap'), {
  ssr: false,
  loading: () => <p className="p-4 font-mono text-xs text-muted">Loading the map…</p>,
});

const LAYER_LABEL = { range: 'Published range map', country: 'Country-level presence' } as const;

/** /map: filters, the map and a results list kept in sync. The list is the accessible equivalent of the map. */
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
  const request = useRef(0);

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
        }
      } catch {
        if (id === request.current) setListFailed(true);
      }
    },
    [group, category],
  );

  const onMove = useCallback(
    (b: Bbox) => {
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

  return (
    <>
      <form method="get" action="/map" className="mt-10" aria-label="Filter the map">
        <details className="disclosure border border-rule bg-panel" open={applied > 0}>
          <summary className="flex min-h-14 items-center px-5 font-mono text-sm font-bold uppercase tracking-[0.1em] text-white">
            <span>Filters{applied ? ` (${applied} applied)` : ''}</span>
          </summary>
          <div className="grid gap-8 border-t border-rule px-5 pt-5 sm:grid-cols-2">
            {[
              { key: 'group', legend: 'Animal group', options: groupOptions, selected: group },
              { key: 'category', legend: 'Status', options: categoryOptions, selected: category },
            ].map((f) => (
              <fieldset key={f.key}>
                <legend className="kicker">{f.legend}</legend>
                <ul className="mt-3 space-y-0.5">
                  {f.options.map((o) => (
                    <li key={o.value}>
                      <label className="flex min-h-8 cursor-pointer items-center gap-3 text-[0.9375rem] hover:text-white">
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
            {applied ? <a href="/map" className="text-sm underline underline-offset-4 hover:text-lime">Reset all</a> : null}
          </div>
        </details>
      </form>

      <div className="mt-6 grid gap-x-10 gap-y-12 lg:grid-cols-[1fr_24rem]">
        <div className="min-w-0 lg:sticky lg:top-6 lg:self-start">
          <div className="relative h-[55vh] min-h-72 overflow-hidden border border-rule bg-panel lg:h-[70vh]">
            {mapFailed ? (
              <p role="status" className="notice m-4 text-[0.9375rem] text-fog">
                <strong className="text-white">The map could not be loaded.</strong> The list still works: it shows every species for the area and filters you chose.
              </p>
            ) : (
              <WorldMap
                data={data}
                fit={initialBbox}
                onMove={onMove}
                onFail={onFail}
                onBasemap={setBasemap}
                label="Map of the species in the list. The list has the same information."
              />
            )}
          </div>
          <div className="mt-5 flex flex-wrap items-start justify-between gap-x-8 gap-y-6">
            <MapLegend />
            <div className="max-w-xs">
              <button
                type="button"
                onClick={nearMe}
                disabled={!basemap}
                className="btn btn-sm btn-secondary"
              >
                Near me
              </button>
              <p className="mt-2 font-mono text-xs leading-relaxed text-muted">Finds your country in this browser only. Your position is never sent to us.</p>
              {nearMessage ? <p className="mt-2 text-sm text-white">{nearMessage}</p> : null}
            </div>
          </div>
        </div>

        <section aria-labelledby="results-h" className="min-w-0">
          <h2 id="results-h" className="type-display text-4xl text-fog">Species in this view</h2>
          {listFailed ? (
            <p role="alert" className="notice-error mt-3 text-sm">Species could not be loaded. This is a problem on our side; please try again.</p>
          ) : (
            <>
              <p role="status" className="meta mt-2" data-testid="map-count">
                {species.length} species in this catalogue match this view
                {data?.truncated ? '. Zoom in to see all of them.' : ''}
              </p>
              {species.length === 0 ? (
                <p className="missing mt-4">No species here match these filters. Move the map or remove a filter.</p>
              ) : (
                <ul className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-1">
                  {species.map((s) => (
                    <li key={s.slug}>
                      <SpeciesCard card={s} />
                      <p className="mt-2 font-mono text-xs text-muted">Shown on the map as: {LAYER_LABEL[s.layer]}</p>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </section>
      </div>
    </>
  );
}
