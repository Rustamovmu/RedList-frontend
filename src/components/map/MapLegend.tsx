import { COUNT_STEPS, MAP_COLORS } from './colors';

/**
 * Legend in words and patterns: each layer is labelled with its kind (PLAN §4 "Map"), never by colour alone.
 * With `counts` (the Map page, D-060) it adds the steps of the count shading, each with its number in words.
 */
export function MapLegend({ showCountry = true, showRange = true, counts = false }: { showCountry?: boolean; showRange?: boolean; counts?: boolean }) {
  return (
    <ul aria-label="Map legend" className="flex flex-col gap-2 text-[0.9375rem] text-fog">
      {showCountry ? (
        <li className="flex items-start gap-3">
          <span aria-hidden className="mt-1 inline-block h-4 w-4 shrink-0" style={{ background: MAP_COLORS.presence }} />
          <span>
            <strong className="font-semibold text-white">Country-level presence</strong>: the whole country or sea is shaded; the species is not everywhere in it.
            {' '}Seas and oceans are shaded more lightly, so the land stays readable.
            {counts ? (
              <>
                {' '}The stronger the shade, the more species of this catalogue are recorded there.
                <span className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[0.8125rem]">
                  {COUNT_STEPS.map((s) => (
                    <span key={s.label} className="inline-flex items-center gap-2">
                      {/* The swatch is the map's own colours: lime at this step's strength over the land colour. */}
                      <span aria-hidden className="relative inline-block h-3.5 w-5 border border-rule" style={{ background: MAP_COLORS.land }}>
                        <span className="absolute inset-0" style={{ background: MAP_COLORS.presence, opacity: s.opacity }} />
                      </span>
                      <span className="figures">{s.label} species</span>
                    </span>
                  ))}
                </span>
              </>
            ) : null}
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
