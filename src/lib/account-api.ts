import { jsonClient } from '@/lib/api-client';
import type { S } from '@/lib/staff-api';

/** The visitor CSRF cookie (D-066): __Host- prefixed over HTTPS, plain on local HTTP (see the API's cookieNames). */
export const ACCOUNT_CSRF_COOKIES = ['__Host-ww_account_csrf', 'ww_account_csrf'] as const;

const { call } = jsonClient('/api/v1', ACCOUNT_CSRF_COOKIES);

/** Visitor accounts and the one sign-in form for everyone (D-066). Types come from the generated contract. */
export const accountApi = {
  /** Staff or visitor: `kind` says which, and so where the browser goes next. */
  signIn: (email: string, password: string) => call<S['SignInResultDto']>('POST', '/auth/sign-in', { email, password }),
  signUp: (b: S['SignUpDto']) => call<S['AccountSessionDto']>('POST', '/account/sign-up', b),
  me: () => call<S['AccountSessionDto']>('GET', '/account/me'),
  logout: () => call<{ ok: true }>('POST', '/account/logout'),
  changePassword: (b: S['AccountPasswordDto']) => call<{ ok: true }>('POST', '/account/password', b),
  deleteAccount: (password: string) => call<{ ok: true }>('POST', '/account/delete', { password }),
};

/**
 * Where to go after a visitor signs in or up: the `next` path from the address bar when it is one of our own public
 * pages, otherwise the home page. Never another site, the staff area or the sign-in pages themselves.
 */
export function nextPath(raw: string | null): string {
  if (!raw || raw.length > 300 || !raw.startsWith('/') || raw.startsWith('//') || raw.includes('\\')) return '/';
  if (/^\/(admin|sign-in|sign-up|api)(\/|$|\?)/.test(raw)) return '/';
  return raw;
}
