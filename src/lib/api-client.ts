/**
 * Browser-side JSON client for our own API. Calls go to same-origin /api/v1 (proxied to the API), so the HttpOnly
 * session cookie travels automatically. Every mutation sends the CSRF token from the readable CSRF cookie in
 * `x-csrf-token` (double submit, PLAN §9). Staff and visitor accounts (D-066) have their own CSRF cookie.
 */
export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: string[],
  ) {
    super(message);
  }
}

/** The value of the first cookie in `names` that is set, read from document.cookie. */
export function readCookie(names: readonly string[]): string | undefined {
  for (const part of document.cookie.split(';')) {
    const [k, ...v] = part.trim().split('=');
    if (names.includes(k)) return decodeURIComponent(v.join('='));
  }
  return undefined;
}

type ErrorBody = { error?: { code?: string; message?: string; details?: unknown } } | null;

async function parse<T>(res: Response): Promise<T> {
  const json = (await res.json().catch(() => null)) as ErrorBody;
  if (!res.ok) {
    const details = Array.isArray(json?.error?.details) ? (json.error.details as unknown[]).map(String) : undefined;
    throw new ApiError(res.status, json?.error?.code ?? 'ERROR', json?.error?.message ?? res.statusText, details);
  }
  return json as T;
}

/** `prefix` is the API path the calls start with, `csrfCookies` the names of the CSRF cookie that goes with it. */
export function jsonClient(prefix: string, csrfCookies: readonly string[]) {
  async function call<T>(method: 'GET' | 'POST' | 'PUT', path: string, body?: unknown): Promise<T> {
    const headers: Record<string, string> = { accept: 'application/json' };
    if (body !== undefined) headers['content-type'] = 'application/json';
    if (method !== 'GET') headers['x-csrf-token'] = readCookie(csrfCookies) ?? '';
    const res = await fetch(`${prefix}${path}`, {
      method,
      headers,
      credentials: 'same-origin',
      cache: 'no-store',
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    return parse<T>(res);
  }

  /** Multipart upload: the browser sets the multipart boundary, so no content-type header here. CSRF as for every mutation. */
  async function upload<T>(path: string, form: FormData): Promise<T> {
    const res = await fetch(`${prefix}${path}`, {
      method: 'POST',
      headers: { accept: 'application/json', 'x-csrf-token': readCookie(csrfCookies) ?? '' },
      credentials: 'same-origin',
      cache: 'no-store',
      body: form,
    });
    return parse<T>(res);
  }

  return { call, upload };
}

export function errorText(e: unknown): string {
  if (e instanceof ApiError) return [e.message, ...(e.details ?? [])].join('\n');
  return e instanceof Error ? e.message : 'Something went wrong';
}
