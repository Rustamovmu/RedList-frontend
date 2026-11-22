import type { Metadata } from 'next';
import { parseBboxParam } from '@/components/map/geo';
import { MapExplorer } from '@/components/map/MapExplorer';
import { apiGet } from '@/lib/api';
import { IUCN_CATEGORIES, IUCN_LABEL } from '@/lib/iucn';
import { GROUP_LABEL } from '@/lib/labels';

export const metadata: Metadata = {
  title: 'Map',
  description: 'Where the species in this catalogue live: country-level presence and published range maps, with a list of the same species.',
  alternates: { canonical: '/map' },
};

type Raw = Record<string, string | string[] | undefined>;
const list = (v: string | string[] | undefined) =>
  [...new Set((Array.isArray(v) ? v : v ? [v] : []).flatMap((x) => x.split(',')).map((x) => x.trim()).filter(Boolean))].slice(0, 11);
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export default async function MapPage({ searchParams }: { searchParams: Promise<Raw> }) {
  const raw = await searchParams;
  const groups = Object.keys(GROUP_LABEL);
  const group = list(raw.group).filter((g) => groups.includes(g));
  const category = list(raw.category).filter((c) => (IUCN_CATEGORIES as readonly string[]).includes(c));
  const bbox = parseBboxParam(one(raw.bbox));

  // The list is rendered on the server first; the map loads in the browser afterwards.
  const [initial, filters] = await Promise.all([
    apiGet('/api/v1/map', {
      query: { bbox: bbox?.join(','), group: group.join(',') || undefined, category: category.join(',') || undefined },
      tags: ['catalogue'],
    }).catch(() => null),
    apiGet('/api/v1/filters', { tags: ['catalogue'] }).catch(() => null),
  ]);

  const groupOptions = (filters?.groups ?? [])
    .filter((g) => g.count > 0 || group.includes(g.value))
    .map((g) => ({ value: g.value, label: GROUP_LABEL[g.value as keyof typeof GROUP_LABEL] ?? g.value, count: g.count }));
  const categoryOptions = IUCN_CATEGORIES.map((c) => ({ value: c, label: `${IUCN_LABEL[c]} (${c})`, count: filters?.categories.find((x) => x.value === c)?.count ?? 0 })).filter(
    (o) => o.count > 0 || category.includes(o.value),
  );

  return (
    <div className="wrap pt-10 md:pt-16">
      <p className="kicker">Catalogue / Map</p>
      <h1 className="h-page mt-3">Map</h1>
      <p className="prose-measure mt-6 text-fog">
        Where the species in this catalogue live. When only the countries or seas are known, whole areas are shaded and labelled
        &ldquo;Country-level presence&rdquo;. A range is drawn only where a cited source publishes one. Species whose locations are withheld for their protection never appear here.
      </p>
      <MapExplorer
        key={`${group.join(',')}|${category.join(',')}`}
        initial={initial}
        initialBbox={bbox}
        group={group}
        category={category}
        groupOptions={groupOptions}
        categoryOptions={categoryOptions}
      />
    </div>
  );
}
