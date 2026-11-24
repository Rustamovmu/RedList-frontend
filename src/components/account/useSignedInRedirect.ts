'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useSyncExternalStore } from 'react';
import { nextPath } from '@/lib/account-api';
import { useWho, type Who } from '@/lib/who';

/**
 * On the sign-in and sign-up pages: once the browser is signed in, staff go to the staff area and a visitor goes
 * back to the page they came from (`?next=`), or home (D-066). Returns who is signed in.
 */
export function useSignedInRedirect(): Who | undefined {
  const router = useRouter();
  const who = useWho();
  useEffect(() => {
    if (who?.kind === 'staff') router.replace('/admin');
    else if (who?.kind === 'visitor') router.replace(nextPath(new URLSearchParams(window.location.search).get('next')));
  }, [who, router]);
  return who;
}

const noSubscribe = () => () => {};

/** The address bar's query string (`?next=…`), empty on the server and during hydration. */
export function useLocationSearch(): string {
  return useSyncExternalStore(noSubscribe, () => window.location.search, () => '');
}
