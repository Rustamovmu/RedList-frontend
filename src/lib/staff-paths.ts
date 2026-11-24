/**
 * Where a browser may land in the staff area (D-065). These rules only decide redirects: the API authorizes every
 * staff request (StaffGuard and the admin role check), so a forged cookie still gets nothing but the home page and 401s.
 * Staff sign in on the form for everyone, `/sign-in` (D-066).
 */

/** Setting a password from a one-time link (D-062). */
export const SET_PASSWORD_PATH = '/admin/set-password';
/** Where anyone without the right session is sent. */
export const GUARD_REDIRECT = '/';

/** Session cookie names, secure and local (see the API's cookieNames). */
export const SESSION_COOKIES = ['__Host-ww_session', 'ww_session'] as const;

export const isStaffPath = (p: string) => p === '/admin' || p.startsWith('/admin/');

/** The one staff page that works without a session. */
export const isOpenStaffPath = (p: string) => p === SET_PASSWORD_PATH;

/** Staff pages for the admin role only; an editor is sent home. */
export const isAdminOnlyPath = (p: string) => p === '/admin/staff' || p.startsWith('/admin/staff/');
