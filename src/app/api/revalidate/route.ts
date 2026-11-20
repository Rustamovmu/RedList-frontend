import { revalidateTag } from 'next/cache';
import { timingSafeEqual } from 'node:crypto';
import { NextResponse } from 'next/server';

/**
 * Called by the backend after publish, rollback or archive with the cache tags to drop.
 * POST { tags: string[] } with header x-revalidate-secret.
 */
const TAG = /^(catalogue|filters|map|support|species:[a-z0-9-]+|region:[a-z0-9-]+)$/;

function secretOk(given: string | null): boolean {
  const expected = process.env.REVALIDATE_SECRET;
  if (!expected || !given) return false;
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(req: Request) {
  if (!secretOk(req.headers.get('x-revalidate-secret'))) {
    return NextResponse.json({ error: { code: 'UNAUTHORIZED', message: 'Bad secret' } }, { status: 401 });
  }
  const body = (await req.json().catch(() => null)) as { tags?: unknown } | null;
  const tags = Array.isArray(body?.tags) ? body.tags : null;
  if (!tags || tags.length === 0 || tags.length > 100 || !tags.every((t) => typeof t === 'string' && TAG.test(t))) {
    return NextResponse.json({ error: { code: 'BAD_REQUEST', message: 'tags must be 1–100 known cache tags' } }, { status: 400 });
  }
  for (const tag of tags as string[]) revalidateTag(tag, { expire: 0 });
  return NextResponse.json({ revalidated: tags });
}
