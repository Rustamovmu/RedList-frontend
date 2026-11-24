/** Map colours, shared by the map (WorldMap) and the legend so they never drift apart. */
export const MAP_COLORS = {
  water: '#0e1e32',
  land: '#1e2733',
  border: '#3a4757',
  presence: '#d9fe8f', // "Country-level presence": lime fill with a lime outline
  presenceOpacity: 0.55,
  presenceLine: '#d9fe8f',
  range: '#ffffff', // "Published range map": white diagonal hatch with a dashed white outline
  focus: '#ffffff', // outline of a place that is hovered, selected or linked to a species in the list (D-060)
  /** Seas and oceans are large boxes; at full strength they flood the map, so their shade is scaled down (D-060). */
  marineFactor: 0.4,
};

/**
 * Map page (D-060): a place is shaded more strongly the more species of this catalogue (matching the filters) are
 * recorded there. Fixed steps, so the legend stays the same whatever the filters. The legend draws the same opacities.
 */
export const COUNT_STEPS = [
  { min: 1, label: '1', opacity: 0.25 },
  { min: 2, label: '2–3', opacity: 0.42 },
  { min: 4, label: '4–7', opacity: 0.6 },
  { min: 8, label: '8+', opacity: 0.8 },
] as const;

/** The index of the step a species count falls in. */
export const countStep = (n: number) => COUNT_STEPS.reduce((at, s, i) => (n >= s.min ? i : at), 0);
