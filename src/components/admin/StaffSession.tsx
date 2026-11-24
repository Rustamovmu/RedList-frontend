'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { errorText, type S, StaffApiError, staffApi } from '@/lib/staff-api';
import { GUARD_REDIRECT, isAdminOnlyPath, isOpenStaffPath } from '@/lib/staff-paths';
import { setWho } from '@/lib/who';

type Ctx = { user: S['StaffMeDto']; signOut: () => Promise<void> };
const StaffCtx = createContext<Ctx | null>(null);

export function useStaff(): Ctx {
  const ctx = useContext(StaffCtx);
  if (!ctx) throw new Error('useStaff outside StaffSessionProvider');
  return ctx;
}

/**
 * Staff area guard (D-065). The set-password page works without a session; every other staff page needs a valid
 * one, and admin-only pages need the admin role. Anyone else is sent to the home page. The proxy already redirects
 * requests without a session cookie; this catches stale sessions and the role check. Staff sign in at /sign-in (D-066).
 */
export function StaffSessionProvider({ children }: { children: React.ReactNode }) {
  if (isOpenStaffPath(usePathname())) return <>{children}</>;
  return <SessionGate>{children}</SessionGate>;
}

function SessionGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const path = usePathname();
  const [user, setUser] = useState<S['StaffMeDto'] | null | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    staffApi
      .me()
      .then((r) => setUser(r.user))
      .catch((e) => (e instanceof StaffApiError && e.status === 401 ? setUser(null) : setError(errorText(e))));
  }, []);

  const denied = user === null || (user !== undefined && isAdminOnlyPath(path) && user.role !== 'admin');
  useEffect(() => {
    if (denied) router.replace(GUARD_REDIRECT);
  }, [denied, router]);

  // Signing out sets the user to null, and the guard above sends the browser home.
  const signOut = useCallback(async () => {
    await staffApi.logout().catch(() => undefined);
    setWho({ kind: 'none' });
    setUser(null);
  }, []);

  if (error) return <p role="alert" className="text-alert">{error}</p>;
  if (user === undefined || denied) return <p role="status" className="meta">Loading…</p>;
  return (
    <StaffCtx.Provider value={{ user, signOut }}>
      <div className="mb-10 flex flex-wrap items-center justify-between gap-x-6 gap-y-3 border-b border-rule">
        <StaffNav isAdmin={user.role === 'admin'} />
        <span className="flex items-center gap-3 pb-2 text-[0.8125rem] text-muted">
          <Link href="/admin/account" className="underline-offset-4 hover:text-lime hover:underline">
            {user.name} ({user.role})
          </Link>
          <button onClick={signOut} className="btn btn-sm btn-quiet">Sign out</button>
        </span>
      </div>
      {children}
    </StaffCtx.Provider>
  );
}

const STAFF_NAV = [
  { href: '/admin', label: 'Species', match: (p: string) => p === '/admin' || p.startsWith('/admin/species') || p.startsWith('/admin/revisions') },
  { href: '/admin/media', label: 'Media', match: (p: string) => p.startsWith('/admin/media') },
  { href: '/admin/support', label: 'Support directory', match: (p: string) => p.startsWith('/admin/support') },
  { href: '/admin/staff', label: 'Staff', match: (p: string) => p.startsWith('/admin/staff'), adminOnly: true },
];

function StaffNav({ isAdmin }: { isAdmin: boolean }) {
  const path = usePathname();
  return (
    <nav aria-label="Staff" className="flex flex-wrap gap-x-6">
      {STAFF_NAV.filter((n) => isAdmin || !n.adminOnly).map((n) => {
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
