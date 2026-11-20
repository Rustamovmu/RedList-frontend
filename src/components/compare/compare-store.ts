'use client';

import { useSyncExternalStore } from 'react';

/**
 * The species a visitor has picked to compare, kept in localStorage while they browse (no account needed).
 * The /compare URL is always the source of truth; this is only the "basket" that builds that URL.
 * Holds slugs only, nothing personal.
 */
const KEY = 'wildward:compare';
export const MAX_COMPARE = 3;
const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const EMPTY: string[] = [];
let cache: { raw: string | null; value: string[] } = { raw: null, value: EMPTY };

function read(): string[] {
  const raw = window.localStorage.getItem(KEY);
  if (raw === cache.raw) return cache.value;
  let value: string[] = EMPTY;
  try {
    const parsed: unknown = JSON.parse(raw ?? '[]');
    if (Array.isArray(parsed)) value = parsed.filter((x): x is string => typeof x === 'string' && SLUG.test(x)).slice(0, MAX_COMPARE);
  } catch {
    value = EMPTY;
  }
  cache = { raw, value };
  return value;
}

const listeners = new Set<() => void>();
function subscribe(fn: () => void) {
  listeners.add(fn);
  window.addEventListener('storage', fn);
  return () => {
    listeners.delete(fn);
    window.removeEventListener('storage', fn);
  };
}

export function writeCompare(slugs: string[]) {
  window.localStorage.setItem(KEY, JSON.stringify([...new Set(slugs)].slice(0, MAX_COMPARE)));
  listeners.forEach((fn) => fn());
}

export function useCompare(): string[] {
  return useSyncExternalStore(subscribe, read, () => EMPTY);
}

export const compareHref = (slugs: string[]) => (slugs.length ? `/compare?species=${slugs.join(',')}` : '/compare');
