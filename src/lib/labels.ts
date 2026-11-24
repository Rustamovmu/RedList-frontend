import type { components } from '@/contracts/api';

type Profile = components['schemas']['SpeciesProfileDto'];
type Estimate = components['schemas']['EstimateDto'];

/** Human labels for API enum values. Kept in one place so every page words them the same way. */
export const GROUP_LABEL: Record<Profile['displayGroup'], string> = {
  mammal: 'Mammal', bird: 'Bird', reptile: 'Reptile', amphibian: 'Amphibian', fish: 'Fish', insect: 'Insect',
  arachnid: 'Arachnid', mollusc: 'Mollusc', crustacean: 'Crustacean', coral: 'Coral', other_invertebrate: 'Other invertebrate',
};

/** Plural group names, for headings and tiles ("Mammals", "Fish"). */
export const GROUP_PLURAL: Record<Profile['displayGroup'], string> = {
  mammal: 'Mammals', bird: 'Birds', reptile: 'Reptiles', amphibian: 'Amphibians', fish: 'Fish', insect: 'Insects',
  arachnid: 'Arachnids', mollusc: 'Molluscs', crustacean: 'Crustaceans', coral: 'Corals', other_invertebrate: 'Other invertebrates',
};

/** Region types, as region pages and the map's selection panel name them. */
export const REGION_TYPE_LABEL: Record<string, string> = { country: 'Country', ocean: 'Ocean', sea: 'Sea', other: 'Marine area' };

export const ENVIRONMENT_LABEL: Record<string, string> = {
  terrestrial: 'Land', freshwater: 'Freshwater', marine: 'Marine', brackish: 'Brackish water', subterranean: 'Underground', aerial: 'Air',
};

export const BASIS_LABEL: Record<Estimate['basis'], string> = {
  mature_individuals: 'mature individuals', breeding_pairs: 'breeding pairs', individuals: 'individuals (all ages)', other: 'other unit',
};

export const TREND_LABEL: Record<string, string> = {
  increasing: 'Increasing', decreasing: 'Decreasing', stable: 'Stable', unknown: 'Trend unknown',
};

export const PRESENCE_LABEL: Record<string, string> = {
  extant: 'Present', probably_extant: 'Probably present', possibly_extant: 'Possibly present', possibly_extinct: 'Possibly extinct here',
  extinct: 'Extinct here', presence_uncertain: 'Presence uncertain',
};
export const ORIGIN_LABEL: Record<string, string> = {
  native: 'Native', reintroduced: 'Reintroduced', introduced: 'Introduced', vagrant: 'Vagrant', origin_uncertain: 'Origin uncertain',
};
export const SEASON_LABEL: Record<string, string> = {
  resident: 'Year-round', breeding: 'Breeding season', non_breeding: 'Non-breeding season', passage: 'Passage', seasonal_uncertain: 'Season uncertain',
};
export const ACTION_LABEL: Record<string, string> = {
  donate: 'Donate', volunteer: 'Volunteer', adopt: 'Adopt', learn: 'Learn', advocate: 'Advocate', other: 'Take action',
};

const nf = new Intl.NumberFormat('en');
/** Counts arrive as decimal strings (bigint). Format without converting large values through Number. */
export function formatCount(v: string): string {
  return v.length <= 15 ? nf.format(Number(v)) : v.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/** "20,000–49,999", "at least 350", "Locally common", or null for unknown. Never renders unknown as zero. */
export function estimateValue(e: Estimate): string | null {
  switch (e.form) {
    case 'exact':
      return e.pointValue ? formatCount(e.pointValue) : null;
    case 'range':
      return e.minValue && e.maxValue ? `${formatCount(e.minValue)}–${formatCount(e.maxValue)}` : null;
    case 'at_least':
      return e.minValue ? `at least ${formatCount(e.minValue)}` : null;
    case 'at_most':
      return e.maxValue ? `at most ${formatCount(e.maxValue)}` : null;
    case 'qualitative':
      return e.qualitativeText;
    case 'unknown':
      return null;
  }
}

/**
 * The estimate a profile shows among its key facts (D-059). It is one of the listed estimates, shown with its own basis,
 * context, place and year, never a sum or a blend of several. Preference, with the editor's order (`position`) as the
 * tie-break: an estimate with a figure, then a qualitative one, then an unknown one; wild before captive; global before
 * regional.
 */
export function headlineEstimate(estimates: readonly Estimate[]): Estimate | null {
  const rank = (e: Estimate) => {
    const value = estimateValue(e);
    const kind = value === null ? 2 : e.form === 'qualitative' ? 1 : 0;
    return kind * 4 + (e.context === 'wild' ? 0 : 2) + (e.scope === 'global' ? 0 : 1);
  };
  let best: Estimate | null = null;
  for (const e of estimates) if (best === null || rank(e) < rank(best)) best = e;
  return best;
}

export function referencePeriod(start: string | null, end: string | null): string | null {
  if (!start && !end) return null;
  const y = (d: string) => d.slice(0, 4);
  if (start && end) return y(start) === y(end) ? y(start) : `${y(start)}–${y(end)}`;
  return y((start ?? end)!);
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' });
}
