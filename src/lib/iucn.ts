import type { components } from '@/contracts/api';

/** IUCN Red List categories. DD and NE are *not* low-risk and are never grouped with LC. */
export const IUCN_CATEGORIES = ['EX', 'EW', 'CR', 'EN', 'VU', 'NT', 'LC', 'DD', 'NE'] as const;
export type IucnCategory = (typeof IUCN_CATEGORIES)[number];

export const IUCN_LABEL: Record<IucnCategory, string> = {
  EX: 'Extinct',
  EW: 'Extinct in the Wild',
  CR: 'Critically Endangered',
  EN: 'Endangered',
  VU: 'Vulnerable',
  NT: 'Near Threatened',
  LC: 'Least Concern',
  DD: 'Data Deficient',
  NE: 'Not Evaluated',
};

/** Threatened = CR, EN, VU (the IUCN definition). */
export const isThreatened = (c: IucnCategory) => c === 'CR' || c === 'EN' || c === 'VU';

// Keeps this file tied to the generated contract so a renamed schema fails typecheck.
export type _ContractAnchor = components['schemas'];
