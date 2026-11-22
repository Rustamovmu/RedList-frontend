'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { useStaff } from '@/components/admin/StaffSession';
import { StaffThumb } from '@/components/admin/StaffThumb';
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

  if (!sp) return error ? <p role="alert" className="text-alert">{error}</p> : <p role="status">Loading…</p>;
  return (
    <div>
      <p className="text-sm"><Link href="/admin" className="underline underline-offset-4">All species</Link></p>
      <h1 className="mt-3 text-3xl font-bold italic tracking-[-0.02em] text-white">{sp.acceptedScientificName}</h1>
      <p className="text-sm text-muted">
        /{sp.slug} · location sensitivity: {sp.locationSensitivity}
        {sp.publishedRevisionId ? <> · <Link href={`/species/${sp.slug}`} className="underline">public page</Link></> : ' · not published'}
      </p>
      {error ? <p role="alert" className="mt-3 whitespace-pre-line text-sm text-alert">{error}</p> : null}
      {notice ? <p role="status" className="mt-3 text-sm">{notice}</p> : null}

      <h2 className="mt-10 text-lg font-bold text-white">Photos on the live version</h2>
      {sp.publishedPhotos.length === 0 ? (
        <p className="mt-2 text-sm italic text-muted">
          {sp.publishedRevisionId
            ? 'The live version has no photo, so the public pages show the neutral “no photo” state.'
            : 'Nothing is published yet.'}{' '}
          Photos are attached in a draft; the <Link href="/admin/media" className="underline">Media</Link> page holds the images.
        </p>
      ) : (
        <ul className="mt-3 grid gap-4 sm:grid-cols-2">
          {sp.publishedPhotos.map((p, i) => (
            <li key={p.mediaId} className="panel flex gap-4 p-4">
              <StaffThumb photo={p} width={110} />
              <div className="min-w-0 text-sm">
                <p className="flex flex-wrap items-center gap-2">
                  <span className={`chip ${i === 0 ? 'border-lime text-lime' : 'text-muted'}`}>{i === 0 ? 'Main photo' : `Photo ${i + 1}`}</span>
                  {p.reviewState === 'approved' ? null : (
                    <span className="font-medium text-alert">
                      {p.reviewState === 'rejected' ? 'Rejected: hidden from public pages now' : 'Back in review'}
                    </span>
                  )}
                </p>
                <p className="mt-2 break-words">{p.altText}</p>
                {p.caption ? <p className="mt-1 break-words text-muted">{p.caption}</p> : null}
                <p className="mt-1 break-words text-[0.8125rem] text-muted">{p.credit} · {p.license}</p>
                <p className="mt-2 text-[0.8125rem]">
                  <Link href="/admin/media" className="underline underline-offset-4">Edit the credit or licence</Link>
                  {' · '}alt text, caption and order: in a draft
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}

      <h2 className="mt-10 text-lg font-bold text-white">Revisions</h2>
      <ul className="panel mt-3 divide-y divide-rule">
        {[...sp.revisions].reverse().map((r) => (
          <li key={r.id} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-3">
            <Link href={`/admin/revisions/${r.id}`} className="font-bold text-white underline-offset-4 hover:text-lime hover:underline">Version {r.version}</Link>
            <span className="flex flex-wrap items-center gap-3 text-sm text-muted">
              <StateChip state={r.state} />
              <span className="text-[0.8125rem]">
                {r.isPublished ? <strong className="text-lime">live · </strong> : null}updated {new Date(r.updatedAt).toLocaleString()}
              </span>
              {user.role === 'admin' && r.state === 'published' && !r.isPublished && sp.publishedRevisionId ? (
                <button type="button" onClick={() => void rollback(r)} className="btn btn-sm btn-secondary">
                  Make this version live again
                </button>
              ) : null}
            </span>
          </li>
        ))}
      </ul>
      <button onClick={newDraft} className="btn btn-primary mt-4">
        New draft{sp.publishedRevisionId ? ' from the published version' : ''}
      </button>

      <h2 className="mt-10 text-lg font-bold text-white">Provider identifiers <span className="text-sm font-normal text-muted">(optional)</span></h2>
      {sp.identifiers.length ? (
        <ul className="mt-2 text-sm">
          {sp.identifiers.map((i) => (
            <li key={i.id}>{i.provider}: {i.externalId}{i.sourceUrl ? <> (<a href={i.sourceUrl} rel="noopener noreferrer" className="underline">link</a>)</> : null}</li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-sm italic text-muted">
          None yet. A species can be published without one. Adding one (a GBIF taxon key, an IUCN taxon id) is what lets an
          import find this species again later, so it is worth filling in when you know it.
        </p>
      )}
      <form onSubmit={addIdentifier} className="mt-3 flex flex-wrap items-end gap-2">
        <label className="block text-sm">Provider
          <input name="provider" required placeholder="gbif" pattern="[a-z][a-z0-9_-]{1,30}" className="field mt-1 w-28 py-1.5 text-sm" />
        </label>
        <label className="block text-sm">ID
          <input name="externalId" required className="field mt-1 w-36 py-1.5 text-sm" />
        </label>
        <label className="block text-sm">Source URL (https, optional)
          <input name="sourceUrl" type="url" className="field mt-1 w-64 max-w-full py-1.5 text-sm" />
        </label>
        <button className="btn btn-sm btn-secondary">Add identifier</button>
      </form>
    </div>
  );
}

/** Revision state as a chip: draft (grey outline), submitted (lime outline), published (lime fill). The word is always shown. */
function StateChip({ state }: { state: string }) {
  const style = state === 'published' ? 'border-lime bg-lime text-black' : state === 'submitted' ? 'border-lime text-lime' : 'text-muted';
  return <span className={`chip ${style}`}>{state}</span>;
}
