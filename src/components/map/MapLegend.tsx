import { MAP_COLORS } from './colors';

/** Legend in words and patterns: each layer is labelled with its kind (PLAN §4 "Map"), never by colour alone. */
export function MapLegend({ showCountry = true, showRange = true }: { showCountry?: boolean; showRange?: boolean }) {
  return (
    <ul aria-label="Map legend" className="flex flex-col gap-2 text-[0.9375rem] text-fog">
      {showCountry ? (
        <li className="flex items-start gap-3">
          <span aria-hidden className="mt-1 inline-block h-4 w-4 shrink-0" style={{ background: MAP_COLORS.presence }} />
          <span>
            <strong className="font-semibold text-white">Country-level presence</strong>: the whole country or sea is shaded; the species is not everywhere in it.
          </span>
        </li>
      ) : null}
      {showRange ? (
        <li className="flex items-start gap-3">
          <span
            aria-hidden
            className="mt-1 inline-block h-4 w-4 shrink-0 border border-dashed"
            style={{ borderColor: MAP_COLORS.range, background: `repeating-linear-gradient(135deg, ${MAP_COLORS.range} 0 2px, transparent 2px 6px)` }}
          />
          <span>
            <strong className="font-semibold text-white">Published range map</strong>: an area from a cited source.
          </span>
        </li>
      ) : null}
    </ul>
  );
}
