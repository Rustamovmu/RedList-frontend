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
  loading: () => <p className="p-4 text-sm text-ink-muted">Loading the map…</p>,
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
      <form method="get" action="/map" className="mt-4" aria-label="Filter the map">
        <details className="rounded border border-line bg-white/60 p-3" open={applied > 0}>
          <summary className="cursor-pointer font-medium">Filters{applied ? ` (${applied} applied)` : ''}</summary>
          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            {[
              { key: 'group', legend: 'Animal group', options: groupOptions, selected: group },
              { key: 'category', legend: 'Status', options: categoryOptions, selected: category },
            ].map((f) => (
              <fieldset key={f.key}>
                <legend className="font-semibold">{f.legend}</legend>
                <ul className="mt-1 space-y-1">
                  {f.options.map((o) => (
                    <li key={o.value}>
                      <label className="flex items-center gap-2 text-sm">
                        <input type="checkbox" name={f.key} value={o.value} defaultChecked={f.selected.includes(o.value)} className="h-4 w-4 accent-forest" />
                        <span>{o.label}</span>
                      </label>
                    </li>
                  ))}
                </ul>
              </fieldset>
            ))}
          </div>
          <input type="hidden" name="bbox" value={bboxParam(bbox)} />
          <div className="mt-3 flex flex-wrap gap-3">
            <button className="rounded bg-forest px-4 py-2 text-paper hover:bg-forest-light">Apply filters</button>
            {applied ? <a href="/map" className="self-center text-sm underline underline-offset-4">Reset all</a> : null}
          </div>
        </details>
      </form>

      <div className="mt-4 grid gap-6 lg:grid-cols-[1fr_22rem]">
        <div className="min-w-0">
          <div className="relative h-[55vh] min-h-64 overflow-hidden rounded border border-line bg-[#d7e4e8]">
            {mapFailed ? (
              <p role="status" className="p-4 text-sm">
                <strong>The map could not be loaded.</strong> The list still works: it shows every species for the area and filters you chose.
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
          <div className="mt-3 flex flex-wrap items-start justify-between gap-3">
            <MapLegend />
            <div className="text-sm">
              <button
                type="button"
                onClick={nearMe}
                disabled={!basemap}
                className="rounded border border-forest px-3 py-1.5 text-forest hover:bg-paper-deep disabled:opacity-50"
              >
                Near me
              </button>
              <p className="mt-1 max-w-xs text-xs text-ink-muted">Finds your country in this browser only. Your position is never sent to us.</p>
              {nearMessage ? <p className="mt-1 max-w-xs text-xs">{nearMessage}</p> : null}
            </div>
          </div>
        </div>

        <section aria-labelledby="results-h" className="min-w-0">
          <h2 id="results-h" className="text-xl font-semibold">Species in this view</h2>
          {listFailed ? (
            <p role="alert" className="mt-2 rounded border border-status-cr p-3 text-sm">Species could not be loaded. This is a problem on our side; please try again.</p>
          ) : (
            <>
              <p role="status" className="mt-1 text-sm text-ink-muted" data-testid="map-count">
                {species.length} species in this catalogue match this view
                {data?.truncated ? '. Zoom in to see all of them.' : ''}
              </p>
              {species.length === 0 ? (
                <p className="mt-3 italic text-ink-muted">No species here match these filters. Move the map or remove a filter.</p>
              ) : (
                <ul className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
                  {species.map((s) => (
                    <li key={s.slug}>
                      <SpeciesCard card={s} />
                      <p className="mt-1 text-xs text-ink-muted">Shown on the map as: {LAYER_LABEL[s.layer]}</p>
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
