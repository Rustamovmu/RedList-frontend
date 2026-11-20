'use client';

import dynamic from 'next/dynamic';
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { components } from '@/contracts/api';
import { boundsOf } from './geo';
import { MapLegend } from './MapLegend';
import type { Basemap } from './WorldMap';

type MapDto = components['schemas']['MapDto'];

const WorldMap = dynamic(() => import('./WorldMap'), {
  ssr: false,
  loading: () => <p className="p-4 text-sm text-ink-muted">Loading the map…</p>,
});

/** The small map in a profile's "Where does it live?" section. Loads after the page; the lists beside it hold the same facts. */
export function ProfileMap({ slug, name }: { slug: string; name: string }) {
  const [data, setData] = useState<MapDto | null>(null);
  const [basemap, setBasemap] = useState<Basemap | null>(null);
  const [failed, setFailed] = useState(false);
  const onFail = useCallback(() => setFailed(true), []);

  useEffect(() => {
    fetch(`/api/v1/map?species=${encodeURIComponent(slug)}`, { headers: { accept: 'application/json' } })
      .then((r) => (r.ok ? (r.json() as Promise<MapDto>) : Promise.reject(new Error(String(r.status)))))
      .then(setData)
      .catch(() => setFailed(true));
  }, [slug]);

  const fit = useMemo(() => {
    if (!data) return null;
    if (data.ranges.length) return boundsOf(data.ranges.map((r) => r.geometry.coordinates));
    if (!basemap) return null;
    const shaded = new Set(data.countryPresence.map((c) => c.slug));
    return boundsOf(basemap.features.filter((f) => shaded.has(f.properties.slug)).map((f) => f.geometry.coordinates));
  }, [data, basemap]);

  if (data && !data.ranges.length && !data.countryPresence.length) return null;

  return (
    <div className="mb-4">
      <div className="h-72 overflow-hidden rounded border border-line bg-[#d7e4e8]">
        {failed ? (
          <p role="status" className="p-4 text-sm">
            <strong>The map could not be loaded.</strong> The list of countries and seas below has the same information.
          </p>
        ) : (
          <WorldMap data={data} fit={fit} onFail={onFail} onBasemap={setBasemap} label={`Map of where ${name} lives. The list below has the same information.`} />
        )}
      </div>
      {data ? <div className="mt-2"><MapLegend showCountry={data.countryPresence.length > 0} showRange={data.ranges.length > 0} /></div> : null}
    </div>
  );
}
