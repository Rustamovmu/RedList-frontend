'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { PersonIcon } from '@/components/shell/Icons';
import { useWho } from '@/lib/who';

const LINK =
  'inline-flex min-h-11 items-center gap-2 whitespace-nowrap text-[0.9375rem] font-semibold text-white decoration-lime decoration-2 underline-offset-[10px] hover:underline';

const short = (name: string) => (name.length > 14 ? `${name.slice(0, 13).trimEnd()}…` : name);

/**
 * The account corner of the main navigation (D-066): "Sign in" for everyone, the visitor's name (their account page)
 * once signed in, or "Staff area" for staff. Until the browser knows, an invisible placeholder keeps the space.
 * Signed in, it is a person icon below lg, with the name or "Staff area" for screen readers only: on phones it
 * shares the logo row with the compare counter, and in the md row there is no room for a name either.
 */
export function AccountLink() {
  const who = useWho();
  const path = usePathname();

  if (!who) return <span aria-hidden className={`${LINK} invisible`}>Sign in</span>;
  if (who.kind === 'staff') {
    return (
      <Link href="/admin" className={`${LINK} min-w-11 justify-center`}>
        <PersonIcon />
        <span className="max-lg:sr-only">Staff area</span>
      </Link>
    );
  }
  if (who.kind === 'visitor') {
    const current = path === '/account';
    return (
      <Link href="/account" aria-current={current ? 'page' : undefined} className={`${LINK} min-w-11 justify-center ${current ? 'underline' : ''}`}>
        <PersonIcon />
        <span className="max-lg:sr-only">{short(who.name)}</span>
        <span className="sr-only"> (your account)</span>
      </Link>
    );
  }
  const current = path === '/sign-in' || path === '/sign-up';
  // Back to this page after signing in, unless it is the home page or a page a visitor cannot use.
  const next = !current && path !== '/' && path !== '/account' && !path.startsWith('/admin') ? `?next=${encodeURIComponent(path)}` : '';
  return (
    <Link href={`/sign-in${next}`} aria-current={current ? 'page' : undefined} className={`${LINK} ${current ? 'underline' : ''}`}>
      Sign in
    </Link>
  );
}
