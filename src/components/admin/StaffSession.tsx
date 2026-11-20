'use client';

import Link from 'next/link';
import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { errorText, type S, StaffApiError, staffApi } from '@/lib/staff-api';

type Ctx = { user: S['StaffMeDto']; signOut: () => Promise<void> };
const StaffCtx = createContext<Ctx | null>(null);

export function useStaff(): Ctx {
  const ctx = useContext(StaffCtx);
  if (!ctx) throw new Error('useStaff outside StaffSessionProvider');
  return ctx;
}

/** Loads the session; shows the sign-in form when there is none. */
export function StaffSessionProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<S['StaffMeDto'] | null | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    staffApi
      .me()
      .then((r) => setUser(r.user))
      .catch((e) => (e instanceof StaffApiError && e.status === 401 ? setUser(null) : setError(errorText(e))));
  }, []);

  const signOut = useCallback(async () => {
    await staffApi.logout().catch(() => undefined);
    setUser(null);
  }, []);

  if (error) return <p role="alert" className="text-status-cr">{error}</p>;
  if (user === undefined) return <p role="status">Loading…</p>;
  if (user === null) return <SignIn onSignedIn={setUser} />;
  return (
    <StaffCtx.Provider value={{ user, signOut }}>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-2 border-b border-line pb-3 text-sm">
        <Link href="/admin" className="font-semibold">Staff area</Link>
        <span>
          {user.name} ({user.role}){' '}
          <button onClick={signOut} className="ml-2 underline underline-offset-4">Sign out</button>
        </span>
      </div>
      {children}
    </StaffCtx.Provider>
  );
}

function SignIn({ onSignedIn }: { onSignedIn: (u: S['StaffMeDto']) => void }) {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setBusy(true);
    setError(null);
    try {
      const r = await staffApi.login(String(f.get('email')), String(f.get('password')));
      onSignedIn(r.user);
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="mx-auto max-w-sm space-y-4" aria-labelledby="signin-h">
      <h1 id="signin-h" className="text-2xl font-semibold">Staff sign-in</h1>
      <label className="block">
        <span className="text-sm font-medium">Email</span>
        <input name="email" type="email" autoComplete="username" required className="mt-1 w-full rounded border border-line bg-white px-3 py-2" />
      </label>
      <label className="block">
        <span className="text-sm font-medium">Password</span>
        <input name="password" type="password" autoComplete="current-password" required className="mt-1 w-full rounded border border-line bg-white px-3 py-2" />
      </label>
      {error ? <p role="alert" className="whitespace-pre-line text-sm text-status-cr">{error}</p> : null}
      <button disabled={busy} className="rounded bg-forest px-4 py-2 text-paper hover:bg-forest-light disabled:opacity-60">
        {busy ? 'Signing in…' : 'Sign in'}
      </button>
    </form>
  );
}
