import { MAP_COLORS } from './colors';

/** Legend in words and patterns: each layer is labelled with its kind (PLAN §4 "Map"), never by colour alone. */
export function MapLegend({ showCountry = true, showRange = true }: { showCountry?: boolean; showRange?: boolean }) {
  return (
    <ul aria-label="Map legend" className="flex flex-wrap gap-x-5 gap-y-1 text-sm">
      {showCountry ? (
        <li className="flex items-center gap-2">
          <span aria-hidden className="inline-block h-4 w-6 rounded-sm border-2" style={{ background: MAP_COLORS.presence, borderColor: MAP_COLORS.presenceLine }} />
          <span>
            <strong className="font-semibold">Country-level presence</strong>: the whole country or sea is shaded; the species is not everywhere in it.
          </span>
        </li>
      ) : null}
      {showRange ? (
        <li className="flex items-center gap-2">
          <span
            aria-hidden
            className="inline-block h-4 w-6 rounded-sm border-2 border-dashed"
            style={{ borderColor: MAP_COLORS.range, background: `repeating-linear-gradient(135deg, ${MAP_COLORS.range} 0 2px, transparent 2px 6px)` }}
          />
          <span>
            <strong className="font-semibold">Published range map</strong>: an area from a cited source.
          </span>
        </li>
      ) : null}
    </ul>
  );
}
