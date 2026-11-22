'use client';

import 'maplibre-gl/dist/maplibre-gl.css';
import { getVersion, Map as MapLibre, NavigationControl, setWorkerUrl } from 'maplibre-gl';
import { useEffect, useRef } from 'react';
import type { components } from '@/contracts/api';
import { MAP_COLORS } from './colors';
import { type Bbox, fitTarget, normalizeBounds } from './geo';

type MapData = Pick<components['schemas']['MapDto'], 'countryPresence' | 'ranges'>;
export type Basemap = components['schemas']['BasemapDto'];


const EMPTY = { type: 'FeatureCollection' as const, features: [] };

/** A diagonal hatch, so the range layer differs from country shading by pattern as well as colour (WCAG 1.4.1). */
function hatch(): { width: number; height: number; data: Uint8Array } {
  const size = 8;
  const data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const on = (x + y) % size === 0 || (x + y) % size === 1;
      const i = (y * size + x) * 4;
      data.set(on ? [255, 255, 255, 230] : [255, 255, 255, 28], i);
    }
  }
  return { width: size, height: size, data };
}

/**
 * The map (PLAN §4 "Map"). Base layer: our own Natural Earth GeoJSON from GET /api/v1/map/basemap (no tile
 * provider, no key, no fonts: there are no text labels). If anything fails, it calls onFail and the page's list keeps working.
 */
export default function WorldMap({
  data,
  fit,
  onMove,
  onFail,
  onBasemap,
  label,
}: {
  data: MapData | null;
  /** Fit the view to this box once loaded (and whenever it changes). */
  fit?: Bbox | null;
  onMove?: (bbox: Bbox) => void;
  onFail: () => void;
  onBasemap?: (b: Basemap) => void;
  label: string;
}) {
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<MapLibre | null>(null);
  const ready = useRef(false);
  const latest = useRef({ data, fit, onMove, onFail, onBasemap });
  useEffect(() => {
    latest.current = { data, fit, onMove, onFail, onBasemap };
  });

  useEffect(() => {
    let cancelled = false;
    let moveTimer: ReturnType<typeof setTimeout> | undefined;

    (async () => {
      try {
        const res = await fetch('/api/v1/map/basemap');
        if (!res.ok) throw new Error(`basemap ${res.status}`);
        const basemap = (await res.json()) as Basemap;
        if (cancelled || !container.current) return;
        latest.current.onBasemap?.(basemap);

        // Served from public/vendor (scripts/copy-maplibre-worker.mjs); the bundler does not emit MapLibre's worker.
        setWorkerUrl(`/vendor/maplibre-gl-worker-${getVersion()}.mjs`);
        const m = new MapLibre({
          container: container.current,
          style: {
            version: 8,
            sources: {
              basemap: { type: 'geojson', data: basemap as unknown as GeoJSON.FeatureCollection },
              ranges: { type: 'geojson', data: EMPTY },
            },
            layers: [
              { id: 'water', type: 'background', paint: { 'background-color': MAP_COLORS.water } },
              { id: 'land', type: 'fill', source: 'basemap', filter: ['==', ['get', 'kind'], 'country'], paint: { 'fill-color': MAP_COLORS.land } },
              { id: 'land-border', type: 'line', source: 'basemap', filter: ['==', ['get', 'kind'], 'country'], paint: { 'line-color': MAP_COLORS.border, 'line-width': 0.6 } },
              { id: 'presence', type: 'fill', source: 'basemap', filter: ['in', ['get', 'slug'], ['literal', []]], paint: { 'fill-color': MAP_COLORS.presence, 'fill-opacity': MAP_COLORS.presenceOpacity } },
              { id: 'presence-line', type: 'line', source: 'basemap', filter: ['in', ['get', 'slug'], ['literal', []]], paint: { 'line-color': MAP_COLORS.presenceLine, 'line-width': 1 } },
              { id: 'range', type: 'fill', source: 'ranges', paint: { 'fill-pattern': 'hatch' } },
              { id: 'range-line', type: 'line', source: 'ranges', paint: { 'line-color': MAP_COLORS.range, 'line-width': 1.5, 'line-dasharray': [2, 1] } },
            ],
          },
          center: [10, 20],
          zoom: 0.6,
          minZoom: 0,
          maxZoom: 8,
          dragRotate: false,
          pitchWithRotate: false,
          attributionControl: { compact: true, customAttribution: 'Boundaries: Natural Earth (public domain)' },
        });
        map.current = m;
        m.addImage('hatch', hatch());
        m.addControl(new NavigationControl({ showCompass: false }), 'top-right');
        m.on('error', () => latest.current.onFail());
        m.on('load', () => {
          ready.current = true;
          apply(m, latest.current.data);
          if (latest.current.fit) m.fitBounds(fitTarget(latest.current.fit), { padding: 24, duration: 0, maxZoom: 6 });
        });
        m.on('moveend', () => {
          clearTimeout(moveTimer);
          moveTimer = setTimeout(() => {
            const b = m.getBounds();
            latest.current.onMove?.(normalizeBounds(b.getWest(), b.getSouth(), b.getEast(), b.getNorth()));
          }, 250);
        });
      } catch {
        if (!cancelled) latest.current.onFail();
      }
    })();

    return () => {
      cancelled = true;
      clearTimeout(moveTimer);
      ready.current = false;
      map.current?.remove();
      map.current = null;
    };
  }, []);

  useEffect(() => {
    if (map.current && ready.current) apply(map.current, data);
  }, [data]);

  useEffect(() => {
    if (map.current && ready.current && fit) map.current.fitBounds(fitTarget(fit), { padding: 24, duration: 0, maxZoom: 6 });
  }, [fit]);

  return <div ref={container} role="region" aria-label={label} className="h-full w-full" data-testid="map-canvas" />;
}

function apply(m: MapLibre, data: MapData | null) {
  const slugs = data?.countryPresence.map((c) => c.slug) ?? [];
  const filter = ['in', ['get', 'slug'], ['literal', slugs]] as ['in', ['get', string], ['literal', string[]]];
  m.setFilter('presence', filter);
  m.setFilter('presence-line', filter);
  const src = m.getSource('ranges') as { setData: (d: GeoJSON.FeatureCollection) => void } | undefined;
  src?.setData({
    type: 'FeatureCollection',
    features: (data?.ranges ?? []).map((r) => ({
      type: 'Feature',
      properties: { species: r.speciesSlug, generalized: r.generalized },
      geometry: r.geometry as unknown as GeoJSON.MultiPolygon,
    })),
  });
}
