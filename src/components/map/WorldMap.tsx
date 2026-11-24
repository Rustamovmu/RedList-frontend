'use client';

import 'maplibre-gl/dist/maplibre-gl.css';
import { layers as protomapsLayers, namedFlavor } from '@protomaps/basemaps';
import {
  addProtocol, type ExpressionSpecification, getVersion, type LayerSpecification, Map as MapLibre, type MapGeoJSONFeature, NavigationControl,
  setWorkerUrl, type SourceSpecification, type StyleSpecification,
} from 'maplibre-gl';
import { PMTiles, Protocol } from 'pmtiles';
import { useEffect, useRef, useState } from 'react';
import type { components } from '@/contracts/api';
import { COUNT_STEPS, countStep, MAP_COLORS } from './colors';
import { type Bbox, fitTarget, normalizeBounds, viewFor, WORLD_VIEW } from './geo';

type MapDto = components['schemas']['MapDto'];
type MapData = Pick<MapDto, 'countryPresence' | 'ranges'> & { species?: MapDto['species'] };
export type Basemap = components['schemas']['BasemapDto'];

/** What a click picked: a shaded country or sea, or a published range map (D-060). */
export type MapPick = { kind: 'region'; slug: string; name: string; regionType: string } | { kind: 'range'; species: string };

type Flag = 'hover' | 'selected' | 'linked';
type Target = { source: 'regions' | 'ranges'; id: string };

const EMPTY = { type: 'FeatureCollection' as const, features: [] };
const NONE: ExpressionSpecification = ['in', ['get', 'slug'], ['literal', []]];

/**
 * The self-hosted Protomaps basemap (D-060): OpenStreetMap data cut to zoom 0–6, plus its fonts and icons, all served
 * from this site by `npm run basemap:fetch`. Nothing is requested from another host. When the file is missing, the map
 * draws our own Natural Earth land instead (D-004), so the page works either way.
 */
const BASEMAP_PATH = '/basemap/world.pmtiles';
const BASEMAP_ATTRIBUTION = '<a href="https://protomaps.com">Protomaps</a> © <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';
/**
 * Protomaps' dark theme, with its land and water in the site's own colours so the map sits in the page. Its labels are
 * dim greys made for dark land; over the lime "Country-level presence" shading they turned muddy, so place names use the
 * site's own fog and muted greys, still with the theme's dark halo.
 */
const FLAVOR = {
  ...namedFlavor('dark'),
  background: MAP_COLORS.water,
  water: MAP_COLORS.water,
  earth: MAP_COLORS.land,
  country_label: '#dcdcdc',
  state_label: '#9aa4b2',
  city_label: '#c8ced6',
  city_label_halo: '#0b1119',
  ocean_label: '#9aa4b2',
};

let protocol: Protocol | null = null;

/** Registers pmtiles:// once and returns the basemap's absolute URL, or null when the file is not on this site. */
async function openBasemap(): Promise<string | null> {
  const url = `${window.location.origin}${BASEMAP_PATH}`;
  // A body-less check first: a missing file answers 404 with nothing left open, and a server that cannot serve byte
  // ranges (the archive is read in small ranges) is not used, rather than downloading the whole file.
  try {
    const head = await fetch(url, { method: 'HEAD' });
    if (!head.ok || head.headers.get('accept-ranges') !== 'bytes') return null;
  } catch {
    return null;
  }
  if (!protocol) {
    protocol = new Protocol();
    addProtocol('pmtiles', protocol.tile);
  }
  let archive = protocol.get(url);
  if (!archive) {
    archive = new PMTiles(url);
    protocol.add(archive);
  }
  try {
    await archive.getHeader();
    return url;
  } catch {
    return null;
  }
}

/** The Protomaps layers, split so our data can sit between the land and the labels. */
function protomapsStyle(url: string) {
  const origin = window.location.origin;
  // The package types its layers with its own copy of the style spec; the shapes are the same.
  const all = protomapsLayers('protomaps', FLAVOR, { lang: 'en' }) as unknown as LayerSpecification[];
  const labelIds = new Set(protomapsLayers('protomaps', FLAVOR, { lang: 'en', labelsOnly: true }).map((l) => l.id));
  return {
    glyphs: `${origin}/basemap/fonts/{fontstack}/{range}.pbf`,
    sprite: `${origin}/basemap/sprites/v4/dark`,
    source: { type: 'vector', url: `pmtiles://${url}`, attribution: BASEMAP_ATTRIBUTION } satisfies SourceSpecification,
    base: all.filter((l) => !labelIds.has(l.id)),
    labels: all.filter((l) => labelIds.has(l.id)),
  };
}

/** Our own Natural Earth land, used when the Protomaps file is not there (the R1 map, D-004). */
const NATURAL_EARTH_LAYERS: LayerSpecification[] = [
  { id: 'water', type: 'background', paint: { 'background-color': MAP_COLORS.water } },
  { id: 'land', type: 'fill', source: 'regions', filter: ['==', ['get', 'kind'], 'country'], paint: { 'fill-color': MAP_COLORS.land } },
  { id: 'land-border', type: 'line', source: 'regions', filter: ['==', ['get', 'kind'], 'country'], paint: { 'line-color': MAP_COLORS.border, 'line-width': 0.6 } },
];

/** A white outline for a place or range that is selected, linked to a list row, or under the pointer; none otherwise. */
const FOCUS_WIDTH: ExpressionSpecification = [
  'case',
  ['boolean', ['feature-state', 'selected'], false], 3,
  ['boolean', ['feature-state', 'linked'], false], 2.5,
  ['boolean', ['feature-state', 'hover'], false], 1.5,
  0,
];

/** 1 for a country, less for a sea or ocean (their shapes are large boxes that would otherwise flood the map). */
const MARINE: ExpressionSpecification = ['case', ['==', ['get', 'kind'], 'country'], 1, MAP_COLORS.marineFactor];

/** The data layers: country-level presence, published ranges, and the focus outlines. Labelled in the legend (PLAN §4). */
const DATA_LAYERS: LayerSpecification[] = [
  { id: 'presence', type: 'fill', source: 'regions', filter: NONE, paint: { 'fill-color': MAP_COLORS.presence, 'fill-opacity': ['*', MAP_COLORS.presenceOpacity, MARINE] } },
  { id: 'presence-line', type: 'line', source: 'regions', filter: NONE, paint: { 'line-color': MAP_COLORS.presenceLine, 'line-width': 1, 'line-opacity': ['case', ['==', ['get', 'kind'], 'country'], 1, 0.5] } },
  { id: 'range', type: 'fill', source: 'ranges', paint: { 'fill-pattern': 'hatch' } },
  { id: 'range-line', type: 'line', source: 'ranges', paint: { 'line-color': MAP_COLORS.range, 'line-width': 1.5, 'line-dasharray': [2, 1] } },
  { id: 'focus', type: 'line', source: 'regions', paint: { 'line-color': MAP_COLORS.focus, 'line-width': FOCUS_WIDTH } },
  { id: 'range-focus', type: 'line', source: 'ranges', paint: { 'line-color': MAP_COLORS.focus, 'line-width': FOCUS_WIDTH } },
];

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
 * The map (PLAN §4 "Map"). The basemap is the self-hosted Protomaps file (or our Natural Earth land without it); the
 * country and sea shapes for "Country-level presence" always come from GET /api/v1/map/basemap. If anything fails before
 * the first render, it calls onFail and the page's list keeps working.
 *
 * With `interactive` (the Map page, D-060): places are shaded by how many species are recorded there, a label follows
 * the pointer, a click reports the place or range through onPick, and `linkedSpecies` outlines one species' places.
 * The list beside the map holds the same information, so none of this is needed to use the page.
 */
export default function WorldMap({
  data,
  fit,
  onMove,
  onFail,
  onBasemap,
  label,
  interactive = false,
  picked = null,
  onPick,
  linkedSpecies = null,
}: {
  data: MapData | null;
  /** Fit the view to this box once loaded (and whenever it changes). */
  fit?: Bbox | null;
  onMove?: (bbox: Bbox) => void;
  onFail: () => void;
  onBasemap?: (b: Basemap) => void;
  label: string;
  interactive?: boolean;
  picked?: MapPick | null;
  onPick?: (p: MapPick | null) => void;
  linkedSpecies?: string | null;
}) {
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<MapLibre | null>(null);
  const ready = useRef(false);
  const flags = useRef<Record<Flag, Target[]>>({ hover: [], selected: [], linked: [] });
  const [tip, setTip] = useState<{ x: number; y: number; text: string; flip: boolean } | null>(null);
  const latest = useRef({ data, fit, onMove, onFail, onBasemap, interactive, picked, onPick, linkedSpecies });
  useEffect(() => {
    latest.current = { data, fit, onMove, onFail, onBasemap, interactive, picked, onPick, linkedSpecies };
  });

  useEffect(() => {
    let cancelled = false;
    let moveTimer: ReturnType<typeof setTimeout> | undefined;

    (async () => {
      try {
        const [res, pmtilesUrl] = await Promise.all([fetch('/api/v1/map/basemap'), openBasemap()]);
        if (!res.ok) throw new Error(`basemap ${res.status}`);
        const basemap = (await res.json()) as Basemap;
        if (cancelled || !container.current) return;
        latest.current.onBasemap?.(basemap);

        const pm = pmtilesUrl ? protomapsStyle(pmtilesUrl) : null;
        const style: StyleSpecification = {
          version: 8,
          ...(pm ? { glyphs: pm.glyphs, sprite: pm.sprite } : {}),
          sources: {
            ...(pm ? { protomaps: pm.source } : {}),
            // promoteId gives each feature an id, so hover, selection and links can use feature state.
            regions: { type: 'geojson', data: basemap as unknown as GeoJSON.FeatureCollection, promoteId: 'slug' },
            ranges: { type: 'geojson', data: EMPTY, promoteId: 'species' },
          },
          layers: pm ? [...pm.base, ...DATA_LAYERS, ...pm.labels] : [...NATURAL_EARTH_LAYERS, ...DATA_LAYERS],
        };

        // Served from public/vendor (scripts/copy-maplibre-worker.mjs); the bundler does not emit MapLibre's worker.
        setWorkerUrl(`/vendor/maplibre-gl-worker-${getVersion()}.mjs`);
        const m = new MapLibre({
          container: container.current,
          style,
          center: [10, 20],
          zoom: 0.6,
          // Below 0 so the whole world view fits a narrow phone map (at zoom 0 the world is 512 px wide).
          minZoom: -2,
          maxZoom: 8,
          dragRotate: false,
          pitchWithRotate: false,
          // Never collapsed: the OpenStreetMap credit stays in view (D-060).
          attributionControl: { compact: false, customAttribution: 'Boundaries: Natural Earth (public domain)' },
          // A plain scroll (or one finger on a touch screen) moves the page, never the map (D-060, owner request).
          // MapLibre zooms with Ctrl + scroll everywhere, ⌘ + scroll on a Mac, and a trackpad pinch (sent as Ctrl + wheel).
          cooperativeGestures: true,
          locale: {
            'CooperativeGesturesHandler.WindowsHelpText': 'Use Ctrl + scroll to zoom the map',
            'CooperativeGesturesHandler.MacHelpText': 'Use Ctrl or ⌘ + scroll, or pinch, to zoom the map',
            'CooperativeGesturesHandler.MobileHelpText': 'Use two fingers to move the map',
          },
        });
        map.current = m;
        m.addImage('hatch', hatch());
        m.addControl(new NavigationControl({ showCompass: false }), 'top-right');
        // Before the first render any error means no map, and the page says so. After it, a missing tile or label is
        // only a gap in the picture, so the map stays.
        m.on('error', () => {
          if (!ready.current) latest.current.onFail();
        });
        m.on('load', () => {
          ready.current = true;
          apply(m, latest.current.data, latest.current.interactive);
          sync(m, flags.current, latest.current);
          fitView(m, latest.current.fit);
        });
        m.on('moveend', () => {
          clearTimeout(moveTimer);
          moveTimer = setTimeout(() => {
            const b = m.getBounds();
            latest.current.onMove?.(normalizeBounds(b.getWest(), b.getSouth(), b.getEast(), b.getNorth()));
          }, 250);
        });
        // The pointer label is for devices that hover. A tap on a touch screen also sends mouse events; there the
        // selection panel says the same, so no label is left behind.
        const canHover = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
        m.on('mousemove', (e) => {
          if (!ready.current || !latest.current.interactive || !canHover) return;
          const f = m.queryRenderedFeatures(e.point, { layers: ['range', 'presence'] })[0];
          setFlag(m, flags.current, 'hover', f ? [targetOf(f)] : []);
          m.getCanvas().style.cursor = f ? 'pointer' : '';
          const width = m.getContainer().clientWidth;
          setTip(f ? { x: e.point.x, y: e.point.y, text: tipText(f, latest.current.data), flip: e.point.x > width - 200 } : null);
        });
        const clearHover = () => {
          if (!ready.current) return;
          setFlag(m, flags.current, 'hover', []);
          m.getCanvas().style.cursor = '';
          setTip(null);
        };
        m.on('mouseout', clearHover);
        // A plain scroll moves the page and shows MapLibre's "Ctrl + scroll" hint; the pointer label would sit on top of it.
        m.on('cooperativegestureprevented', clearHover);
        m.on('click', (e) => {
          const { interactive: on, onPick: pick } = latest.current;
          if (!ready.current || !on || !pick) return;
          const f = m.queryRenderedFeatures(e.point, { layers: ['range', 'presence'] })[0];
          pick(f ? pickOf(f) : null);
        });
      } catch {
        if (!cancelled) latest.current.onFail();
      }
    })();

    return () => {
      cancelled = true;
      clearTimeout(moveTimer);
      ready.current = false;
      flags.current = { hover: [], selected: [], linked: [] };
      map.current?.remove();
      map.current = null;
    };
  }, []);

  useEffect(() => {
    if (!map.current || !ready.current) return;
    apply(map.current, data, latest.current.interactive);
    sync(map.current, flags.current, latest.current);
  }, [data]);

  useEffect(() => {
    if (map.current && ready.current) sync(map.current, flags.current, latest.current);
  }, [picked, linkedSpecies]);

  useEffect(() => {
    if (map.current && ready.current && fit) fitView(map.current, fit);
  }, [fit]);

  return (
    // `isolate`: MapLibre's gesture hint has z-index 99999. Kept inside the map, it never covers the sticky nav.
    <div className="relative isolate h-full w-full">
      {/* Sized by h-full/w-full, not by absolute insets: MapLibre's own CSS makes its container position: relative. */}
      <div ref={container} role="region" aria-label={label} className="h-full w-full" data-testid="map-canvas" />
      {/* A pointer label for mouse users. The list and the selection panel carry the same facts, so it is hidden from assistive technology. */}
      {tip ? (
        <div
          aria-hidden
          className="pointer-events-none absolute z-10 border border-rule bg-black px-2.5 py-1.5 text-[0.8125rem] font-semibold whitespace-nowrap text-white"
          style={{ left: tip.x, top: tip.y, transform: `translate(${tip.flip ? 'calc(-100% - 14px)' : '14px'}, -50%)` }}
        >
          {tip.text}
        </div>
      ) : null}
    </div>
  );
}

/** Shows a box, or the world view (84° N to 60° S) when there is none or it spans every longitude. The world view is
 *  fitted without padding, so it fills the frame from edge to edge (D-060). */
function fitView(m: MapLibre, fit: Bbox | null | undefined) {
  const box = viewFor(fit);
  m.fitBounds(fitTarget(box), { padding: box === WORLD_VIEW ? 0 : 24, duration: 0, maxZoom: 6 });
}

function apply(m: MapLibre, data: MapData | null, countShading: boolean) {
  const presence = data?.countryPresence ?? [];
  const filter: ExpressionSpecification = ['in', ['get', 'slug'], ['literal', presence.map((c) => c.slug)]];
  m.setFilter('presence', filter);
  m.setFilter('presence-line', filter);
  m.setPaintProperty('presence', 'fill-opacity', ['*', countShading ? countOpacity(presence) : MAP_COLORS.presenceOpacity, MARINE]);
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

/** fill-opacity by species count, in the steps the legend shows (COUNT_STEPS). */
function countOpacity(presence: MapData['countryPresence']): ExpressionSpecification | number {
  const groups: string[][] = COUNT_STEPS.map(() => []);
  for (const c of presence) groups[countStep(c.speciesCount)]!.push(c.slug);
  const pairs = groups.flatMap((g, i) => (g.length ? [g, COUNT_STEPS[i]!.opacity] : []));
  // A `match` built at run time; its shape is right but TypeScript cannot check a spread tuple.
  return pairs.length ? (['match', ['get', 'slug'], ...pairs, MAP_COLORS.presenceOpacity] as unknown as ExpressionSpecification) : MAP_COLORS.presenceOpacity;
}

/** Selection and list links, from the latest props. Hover is kept by the pointer handlers. */
function sync(m: MapLibre, store: Record<Flag, Target[]>, p: { data: MapData | null; picked: MapPick | null; linkedSpecies: string | null }) {
  const picked: Target[] = !p.picked ? [] : p.picked.kind === 'region' ? [{ source: 'regions', id: p.picked.slug }] : [{ source: 'ranges', id: p.picked.species }];
  setFlag(m, store, 'selected', picked, true);
  setFlag(m, store, 'linked', p.linkedSpecies ? linkTargets(p.data, p.linkedSpecies) : [], true);
}

/** The places and range of one species in the current data. */
function linkTargets(data: MapData | null, slug: string): Target[] {
  const regions: Target[] = (data?.countryPresence ?? []).filter((c) => c.species.includes(slug)).map((c) => ({ source: 'regions', id: c.slug }));
  const range: Target[] = (data?.ranges ?? []).some((r) => r.speciesSlug === slug) ? [{ source: 'ranges', id: slug }] : [];
  return [...regions, ...range];
}

/** Moves one feature-state flag to `next`. Unchanged targets are skipped unless `force` (after new data). */
function setFlag(m: MapLibre, store: Record<Flag, Target[]>, flag: Flag, next: Target[], force = false) {
  const same = store[flag].length === next.length && store[flag].every((t, i) => t.source === next[i]!.source && t.id === next[i]!.id);
  if (same && !force) return;
  for (const t of store[flag]) m.setFeatureState(t, { [flag]: false });
  for (const t of next) m.setFeatureState(t, { [flag]: true });
  store[flag] = next;
}

function targetOf(f: MapGeoJSONFeature): Target {
  return f.layer.id === 'range' ? { source: 'ranges', id: String(f.properties.species) } : { source: 'regions', id: String(f.properties.slug) };
}

function pickOf(f: MapGeoJSONFeature): MapPick {
  if (f.layer.id === 'range') return { kind: 'range', species: String(f.properties.species) };
  return { kind: 'region', slug: String(f.properties.slug), name: String(f.properties.name), regionType: String(f.properties.kind) };
}

function tipText(f: MapGeoJSONFeature, data: MapData | null): string {
  if (f.layer.id === 'range') {
    const s = data?.species?.find((x) => x.slug === f.properties.species);
    return `Published range map: ${s?.commonName ?? s?.scientificName ?? String(f.properties.species)}`;
  }
  const n = data?.countryPresence.find((c) => c.slug === f.properties.slug)?.speciesCount ?? 0;
  return `${String(f.properties.name)} · ${n} species`;
}
