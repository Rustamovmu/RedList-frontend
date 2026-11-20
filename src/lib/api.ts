import 'server-only';
import type { paths } from '@/contracts/api';

/**
 * Server-side API client. Requests go to API_INTERNAL_URL (never exposed to the browser).
 * Every read carries cache tags. The backend calls /api/revalidate with those tags when
 * content is published, so published changes appear everywhere at once (docs/PLAN.md §3).
 */
const API = process.env.API_INTERNAL_URL ?? 'http://localhost:4000';

type GetPath = { [P in keyof paths]: paths[P] extends { get: unknown } ? P : never }[keyof paths];
type JsonOk<P extends GetPath> = paths[P]['get'] extends { responses: { 200: { content: { 'application/json': infer R } } } } ? R : never;

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
  }
}

export async function apiGet<P extends GetPath>(
  path: P,
  opts: {
    tags?: string[];
    /** Values for `{name}` placeholders in the path. They are URI-encoded. */
    params?: Record<string, string>;
    query?: Record<string, string | undefined>;
    revalidate?: number | false;
  } = {},
): Promise<JsonOk<P>> {
  const qs = new URLSearchParams(Object.entries(opts.query ?? {}).filter((e): e is [string, string] => e[1] !== undefined));
  const resolved = (path as string).replace(/\{(\w+)\}/g, (_, k: string) => {
    const v = opts.params?.[k];
    if (v === undefined) throw new Error(`Missing path parameter ${k} for ${path}`);
    return encodeURIComponent(v);
  });
  const url = `${API}${resolved}${qs.size ? `?${qs}` : ''}`;
  const res = await fetch(url, {
    headers: { accept: 'application/json' },
    next: { tags: opts.tags ?? [], revalidate: opts.revalidate ?? false },
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: { code?: string; message?: string } } | null;
    throw new ApiError(res.status, body?.error?.code ?? 'ERROR', body?.error?.message ?? res.statusText);
  }
  return (await res.json()) as JsonOk<P>;
}
