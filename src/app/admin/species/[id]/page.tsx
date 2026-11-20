'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { useStaff } from '@/components/admin/StaffSession';
import { errorText, type S, staffApi } from '@/lib/staff-api';

export default function AdminSpecies() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [sp, setSp] = useState<S['StaffSpeciesDto'] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const { user } = useStaff();

  const reload = useCallback(() => staffApi.getSpecies(id).then(setSp).catch((e) => setError(errorText(e))), [id]);
  useEffect(() => {
    reload();
  }, [reload]);

  async function addIdentifier(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const f = new FormData(form);
    setError(null);
    try {
      setSp(await staffApi.addIdentifier(id, { provider: String(f.get('provider')), externalId: String(f.get('externalId')), sourceUrl: String(f.get('sourceUrl')) || null }));
      form.reset();
    } catch (err) {
      setError(errorText(err));
    }
  }

  async function newDraft() {
    setError(null);
    try {
      const d = await staffApi.createDraft(id);
      router.push(`/admin/revisions/${d.id}`);
    } catch (err) {
      setError(errorText(err));
    }
  }

  /** Rollback (admin only, PLAN §6): make an earlier published version live again. Audited; needs a reason. */
  async function rollback(r: S['RevisionSummaryDto']) {
    if (!sp?.publishedRevisionId) return;
    const reason = window.prompt(`Make version ${r.version} live again instead of the current version? Give a short reason (kept in the audit log).`);
    if (!reason || reason.trim().length < 3) return;
    setError(null);
    setNotice(null);
    try {
      setSp(await staffApi.rollback(id, { targetRevisionId: r.id, expectedPublishedRevisionId: sp.publishedRevisionId, reason: reason.trim() }));
      setNotice(`Version ${r.version} is live again. Drafts started from the replaced version can no longer be published; start a new draft.`);
    } catch (err) {
      setError(errorText(err));
    }
  }

  if (!sp) return error ? <p role="alert" className="text-status-cr">{error}</p> : <p role="status">Loading…</p>;
  return (
    <div>
      <p className="text-sm"><Link href="/admin" className="underline underline-offset-4">All species</Link></p>
      <h1 className="mt-2 text-2xl font-semibold italic">{sp.acceptedScientificName}</h1>
      <p className="text-sm text-ink-muted">
        /{sp.slug} · location sensitivity: {sp.locationSensitivity}
        {sp.publishedRevisionId ? <> · <Link href={`/species/${sp.slug}`} className="underline">public page</Link></> : ' · not published'}
      </p>
      {error ? <p role="alert" className="mt-3 whitespace-pre-line text-sm text-status-cr">{error}</p> : null}
      {notice ? <p role="status" className="mt-3 text-sm">{notice}</p> : null}

      <h2 className="mt-8 text-lg font-semibold">Revisions</h2>
      <ul className="mt-2 divide-y divide-line rounded border border-line bg-white/60">
        {[...sp.revisions].reverse().map((r) => (
          <li key={r.id} className="flex flex-wrap justify-between gap-2 px-3 py-2">
            <Link href={`/admin/revisions/${r.id}`} className="font-medium underline-offset-4 hover:underline">Version {r.version}</Link>
            <span className="flex flex-wrap items-center gap-3 text-sm text-ink-muted">
              <span>
                {r.state}
                {r.isPublished ? ' · live' : ''} · updated {new Date(r.updatedAt).toLocaleString()}
              </span>
              {user.role === 'admin' && r.state === 'published' && !r.isPublished && sp.publishedRevisionId ? (
                <button type="button" onClick={() => void rollback(r)} className="rounded border border-forest px-2 py-0.5 text-forest hover:bg-paper-deep">
                  Make this version live again
                </button>
              ) : null}
            </span>
          </li>
        ))}
      </ul>
      <button onClick={newDraft} className="mt-3 rounded bg-forest px-4 py-2 text-paper hover:bg-forest-light">
        New draft{sp.publishedRevisionId ? ' from the published version' : ''}
      </button>

      <h2 className="mt-8 text-lg font-semibold">Provider identifiers</h2>
      {sp.identifiers.length ? (
        <ul className="mt-2 text-sm">
          {sp.identifiers.map((i) => (
            <li key={i.id}>{i.provider}: {i.externalId}{i.sourceUrl ? <> (<a href={i.sourceUrl} rel="noopener noreferrer" className="underline">link</a>)</> : null}</li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-sm italic text-ink-muted">None yet. At least one is required to publish.</p>
      )}
      <form onSubmit={addIdentifier} className="mt-3 flex flex-wrap items-end gap-2">
        <label className="block text-sm">Provider
          <input name="provider" required placeholder="gbif" pattern="[a-z][a-z0-9_-]{1,30}" className="mt-1 block w-28 rounded border border-line bg-white px-2 py-1" />
        </label>
        <label className="block text-sm">ID
          <input name="externalId" required className="mt-1 block w-36 rounded border border-line bg-white px-2 py-1" />
        </label>
        <label className="block text-sm">Source URL (https, optional)
          <input name="sourceUrl" type="url" className="mt-1 block w-64 max-w-full rounded border border-line bg-white px-2 py-1" />
        </label>
        <button className="rounded border border-forest px-3 py-1 text-sm text-forest">Add identifier</button>
      </form>
    </div>
  );
}
