'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
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

  if (error) return <p role="alert" className="text-alert">{error}</p>;
  if (user === undefined) return <p role="status" className="meta">Loading…</p>;
  if (user === null) return <SignIn onSignedIn={setUser} />;
  return (
    <StaffCtx.Provider value={{ user, signOut }}>
      <div className="mb-10 flex flex-wrap items-center justify-between gap-x-6 gap-y-3 border-b border-rule">
        <StaffNav />
        <span className="flex items-center gap-3 pb-2 text-[0.8125rem] text-muted">
          {user.name} ({user.role})
          <button onClick={signOut} className="btn btn-sm btn-quiet">Sign out</button>
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
    <form onSubmit={submit} className="panel mx-auto mt-6 max-w-[380px] space-y-5 p-7" aria-labelledby="signin-h">
      <h1 id="signin-h" className="text-[2rem] font-bold leading-tight tracking-[-0.02em] text-white">Staff sign-in</h1>
      <label className="block">
        <span className="label">Email</span>
        <input name="email" type="email" autoComplete="username" required className="field mt-1.5" />
      </label>
      <label className="block">
        <span className="label">Password</span>
        <input name="password" type="password" autoComplete="current-password" required className="field mt-1.5" />
      </label>
      {error ? <p role="alert" className="whitespace-pre-line text-sm text-alert">{error}</p> : null}
      <button disabled={busy} className="btn btn-primary w-full">
        {busy ? 'Signing in…' : 'Sign in'}
      </button>
    </form>
  );
}

const STAFF_NAV = [
  { href: '/admin', label: 'Species', match: (p: string) => p === '/admin' || p.startsWith('/admin/species') || p.startsWith('/admin/revisions') },
  { href: '/admin/media', label: 'Media', match: (p: string) => p.startsWith('/admin/media') },
  { href: '/admin/support', label: 'Support directory', match: (p: string) => p.startsWith('/admin/support') },
];

function StaffNav() {
  const path = usePathname();
  return (
    <nav aria-label="Staff" className="flex flex-wrap gap-x-6">
      {STAFF_NAV.map((n) => {
        const current = n.match(path);
        return (
          <Link
            key={n.href}
            href={n.href}
            aria-current={current ? 'page' : undefined}
            className={`-mb-px inline-flex min-h-11 items-center border-b-2 text-[0.9375rem] font-semibold ${current ? 'border-lime text-lime' : 'border-transparent text-fog hover:text-lime'}`}
          >
            {n.label}
          </Link>
        );
      })}
    </nav>
  );
}
