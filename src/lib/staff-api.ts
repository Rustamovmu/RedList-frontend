import type { components } from '@/contracts/api';

/**
 * Browser-side client for the staff API. Calls go to same-origin /api/v1 (proxied to the API), so the
 * HttpOnly session cookie travels automatically. Every mutation sends the CSRF token from the readable
 * CSRF cookie in `x-csrf-token` (double submit, PLAN §9). Types come from the generated contract.
 */
export type S = components['schemas'];

export class StaffApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: string[],
  ) {
    super(message);
  }
}

function csrfToken(): string | undefined {
  for (const part of document.cookie.split(';')) {
    const [k, ...v] = part.trim().split('=');
    if (k === '__Host-ww_csrf' || k === 'ww_csrf') return decodeURIComponent(v.join('='));
  }
  return undefined;
}

async function call<T>(method: 'GET' | 'POST' | 'PUT', path: string, body?: unknown): Promise<T> {
  const headers: Record<string, string> = { accept: 'application/json' };
  if (body !== undefined) headers['content-type'] = 'application/json';
  if (method !== 'GET') headers['x-csrf-token'] = csrfToken() ?? '';
  const res = await fetch(`/api/v1/staff${path}`, {
    method,
    headers,
    credentials: 'same-origin',
    cache: 'no-store',
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const json = (await res.json().catch(() => null)) as { error?: { code?: string; message?: string; details?: unknown } } | null;
  if (!res.ok) {
    const details = Array.isArray(json?.error?.details) ? (json.error.details as unknown[]).map(String) : undefined;
    throw new StaffApiError(res.status, json?.error?.code ?? 'ERROR', json?.error?.message ?? res.statusText, details);
  }
  return json as T;
}

const enc = encodeURIComponent;

export const staffApi = {
  me: () => call<{ user: S['StaffMeDto']; csrfToken: string }>('GET', '/auth/me'),
  login: (email: string, password: string) => call<{ user: S['StaffMeDto']; csrfToken: string }>('POST', '/auth/login', { email, password }),
  logout: () => call<{ ok: true }>('POST', '/auth/logout'),

  listSpecies: () => call<S['StaffSpeciesDto'][]>('GET', '/species'),
  getSpecies: (id: string) => call<S['StaffSpeciesDto']>('GET', `/species/${enc(id)}`),
  createSpecies: (b: S['CreateSpeciesDto']) => call<S['RevisionDetailDto']>('POST', '/species', b),
  addIdentifier: (id: string, b: S['AddIdentifierDto']) => call<S['StaffSpeciesDto']>('POST', `/species/${enc(id)}/identifiers`, b),
  createDraft: (id: string) => call<S['RevisionDetailDto']>('POST', `/species/${enc(id)}/drafts`),

  getRevision: (id: string) => call<S['RevisionDetailDto']>('GET', `/revisions/${enc(id)}`),
  saveDraft: (id: string, b: S['SaveDraftDto']) => call<S['RevisionDetailDto']>('PUT', `/revisions/${enc(id)}`, b),
  submit: (id: string) => call<S['RevisionDetailDto']>('POST', `/revisions/${enc(id)}/submit`),
  publish: (id: string) => call<S['RevisionDetailDto']>('POST', `/revisions/${enc(id)}/publish`),
  requestChanges: (id: string, notes: string) => call<S['RevisionDetailDto']>('POST', `/revisions/${enc(id)}/request-changes`, { notes }),

  listSources: (q?: string) => call<S['SourceDto'][]>('GET', `/sources${q ? `?q=${enc(q)}` : ''}`),
  createSource: (b: S['CreateSourceDto']) => call<S['SourceDto']>('POST', '/sources', b),
  reference: () => call<S['ReferenceListsDto']>('GET', '/reference'),
};

export function errorText(e: unknown): string {
  if (e instanceof StaffApiError) return [e.message, ...(e.details ?? [])].join('\n');
  return e instanceof Error ? e.message : 'Something went wrong';
}
