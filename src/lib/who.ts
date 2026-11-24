'use client';

import { useSyncExternalStore } from 'react';
import { ACCOUNT_CSRF_COOKIES, accountApi } from '@/lib/account-api';
import { readCookie } from '@/lib/api-client';
import { STAFF_CSRF_COOKIES, staffApi } from '@/lib/staff-api';

/** Who this browser is signed in as (D-066). `undefined` while unknown (on the server and before the first check). */
export type Who = { kind: 'none' } | { kind: 'visitor'; name: string } | { kind: 'staff'; name: string };

let current: Who | undefined;
let loading: Promise<void> | null = null;
const listeners = new Set<() => void>();

function set(who: Who) {
  current = who;
  for (const l of listeners) l();
}

/**
 * Asks the API, but only when a readable CSRF cookie says a session may exist: a visitor who never signed in costs
 * no request. A stale cookie gets 401 and counts as signed out.
 */
function load(): Promise<void> {
  loading ??= (async () => {
    try {
      if (readCookie(STAFF_CSRF_COOKIES)) {
        const r = await staffApi.me().catch(() => null);
        if (r) return set({ kind: 'staff', name: r.user.name });
      }
      if (readCookie(ACCOUNT_CSRF_COOKIES)) {
        const r = await accountApi.me().catch(() => null);
        if (r) return set({ kind: 'visitor', name: r.user.name });
      }
      set({ kind: 'none' });
    } finally {
      loading = null;
    }
  })();
  return loading;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (current === undefined) void load();
  return () => listeners.delete(listener);
}

export function useWho(): Who | undefined {
  return useSyncExternalStore(subscribe, () => current, () => undefined);
}

/** After signing in, up or out: tell every component at once, without asking the API again. */
export function setWho(who: Who) {
  set(who);
}
