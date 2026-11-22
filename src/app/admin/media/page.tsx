'use client';

import { useCallback, useEffect, useState } from 'react';
import { useStaff } from '@/components/admin/StaffSession';
import { errorText, type S, staffApi } from '@/lib/staff-api';

type Media = S['StaffMediaDto'];
type State = Media['reviewState'];

const STATE_LABEL: Record<State, string> = { pending: 'Pending review', approved: 'Approved', rejected: 'Rejected (hidden)' };
// The allow-list (AGENTS.md, PLAN §8). The API enforces it too; this list only helps staff pick a valid value.
const LICENCES = ['CC0', 'PDM', 'CC BY 4.0', 'CC BY 3.0', 'CC BY 2.0', 'CC BY-SA 4.0', 'CC BY-SA 3.0', 'CC BY-SA 2.0'];
const input = 'field mt-1';

/**
 * Media upload and review queue (PLAN §7, §9; DECISIONS D-022). Any staff member uploads and edits; only admins
 * approve or reject. Uploads are re-encoded on the server, which removes EXIF and GPS data. Editing an image's
 * credit or licence sends it back to review; published pages keep the credit they were published with.
 * Rejecting an image removes it from public pages at once.
 */
export default function MediaAdmin() {
  const { user } = useStaff();
  const isAdmin = user.role === 'admin';
  const [filter, setFilter] = useState<State | 'all'>('pending');
  const [items, setItems] = useState<Media[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const reload = useCallback(
    () => staffApi.listMedia(filter === 'all' ? undefined : filter).then(setItems).catch((e) => setError(errorText(e))),
    [filter],
  );
  useEffect(() => {
    void reload();
  }, [reload]);

  async function run(what: string, fn: () => Promise<unknown>) {
    setError(null);
    setNotice(null);
    setBusy(true);
    try {
      await fn();
      setNotice(what);
      await reload();
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  }

  async function onUpload(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const f = new FormData(form);
    for (const k of ['sourceUrl', 'licenseUrl', 'modifications']) if (!String(f.get(k) ?? '').trim()) f.delete(k);
    await run('Uploaded. The image is pending review and is not public until an admin approves it.', () => staffApi.uploadMedia(f));
    form.reset();
  }

  return (
    <div>
      <h1 className="font-mono text-2xl font-bold text-lime">Media</h1>
      <p className="mt-1 max-w-3xl text-sm text-muted">
        Only allow-listed licences are accepted: CC0, Public Domain Mark, CC BY and CC BY-SA. Check the licence on the source page of each file
        before uploading. Images are resized and re-encoded, which removes embedded metadata such as camera details and GPS position.
        {isAdmin ? null : ' Only admins can approve or reject images.'}
      </p>
      {error ? <p role="alert" className="mt-3 whitespace-pre-line text-sm text-alert">{error}</p> : null}
      {notice ? <p role="status" className="mt-3 text-sm">{notice}</p> : null}

      <form onSubmit={onUpload} className="panel mt-6 grid gap-4 p-5 sm:grid-cols-2" aria-labelledby="upload-h">
        <h2 id="upload-h" className="font-mono text-sm font-bold uppercase tracking-[0.12em] text-lime sm:col-span-2">Upload an image</h2>
        <label className="block sm:col-span-2">
          <span className="text-sm font-medium">Image file (JPEG, PNG or WebP, at least 200 pixels wide)</span>
          <input name="file" type="file" required accept="image/jpeg,image/png,image/webp" className="mt-1 block w-full text-sm" />
        </label>
        <MetadataFields />
        <div className="sm:col-span-2">
          <button disabled={busy} className="btn btn-primary">Upload</button>
        </div>
      </form>

      <div className="mt-8 flex flex-wrap items-center gap-3">
        <h2 className="font-mono text-sm font-bold uppercase tracking-[0.12em] text-lime">Images</h2>
        <label className="text-sm">
          Show{' '}
          <select value={filter} onChange={(e) => setFilter(e.target.value as State | 'all')} className="field mt-1 inline-block w-auto py-1.5 text-sm">
            <option value="pending">Pending review</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="all">All</option>
          </select>
        </label>
      </div>
      {items === null ? (
        <p role="status" className="mt-3">Loading…</p>
      ) : items.length === 0 ? (
        <p className="mt-3 italic text-muted">No images here.</p>
      ) : (
        <ul className="mt-4 space-y-4">
          {items.map((m) => (
            <li key={m.id}>
              <MediaItem m={m} isAdmin={isAdmin} busy={busy} run={run} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function MetadataFields({ m }: { m?: Media }) {
  return (
    <>
      <label className="block">
        <span className="text-sm font-medium">Creator</span>
        <input name="creator" required defaultValue={m?.creator} maxLength={200} className={input} />
      </label>
      <label className="block">
        <span className="text-sm font-medium">Licence</span>
        <select name="license" required defaultValue={m?.license ?? ''} className={input}>
          <option value="" disabled>Choose…</option>
          {[...new Set([...LICENCES, ...(m ? [m.license] : [])])].map((l) => (
            <option key={l} value={l}>{l}</option>
          ))}
        </select>
      </label>
      <label className="block sm:col-span-2">
        <span className="text-sm font-medium">Credit line shown under the image</span>
        <input name="credit" required minLength={3} maxLength={300} defaultValue={m?.credit} placeholder="Photo: Jane Doe, CC BY 4.0, via Wikimedia Commons" className={input} />
      </label>
      <label className="block">
        <span className="text-sm font-medium">Source page (https)</span>
        <input name="sourceUrl" type="url" pattern="https://.*" defaultValue={m?.sourceUrl ?? ''} className={input} />
      </label>
      <label className="block">
        <span className="text-sm font-medium">Licence deed URL (optional)</span>
        <input name="licenseUrl" type="url" pattern="https://.*" defaultValue={m?.licenseUrl ?? ''} className={input} />
      </label>
      <label className="block sm:col-span-2">
        <span className="text-sm font-medium">Your changes before upload, e.g. cropping (optional)</span>
        <input name="modifications" maxLength={500} className={input} />
      </label>
    </>
  );
}

type Run = (what: string, fn: () => Promise<unknown>) => Promise<void>;

function MediaItem({ m, isAdmin, busy, run }: { m: Media; isAdmin: boolean; busy: boolean; run: Run }) {
  const [editing, setEditing] = useState(false);

  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const opt = (k: string) => String(f.get(k) ?? '').trim() || null;
    await run('Saved. The image is pending review again; published pages keep their recorded credit.', () =>
      staffApi.updateMedia(m.id, {
        creator: String(f.get('creator')), credit: String(f.get('credit')), license: String(f.get('license')),
        sourceUrl: opt('sourceUrl'), licenseUrl: opt('licenseUrl'), modifications: opt('modifications') ?? m.modifications,
      }),
    );
    setEditing(false);
  }

  function reject() {
    const note = window.prompt('Why is this image rejected? (Kept for staff only.)');
    if (note && note.trim().length >= 3) void run('Rejected. The image is hidden from all public pages.', () => staffApi.rejectMedia(m.id, note.trim()));
  }

  return (
    <article className="panel grid gap-5 p-5 sm:grid-cols-[200px_1fr]" aria-label={`Image by ${m.creator}`}>
      {/* A plain img on purpose: the staff preview needs the session cookie and must never go through the public image loader. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={staffApi.mediaPreviewUrl(m.id, 320)} alt="" width={200} height={Math.round((200 * m.height) / m.width)} className="h-auto w-full border border-rule bg-black" />
      <div className="min-w-0 text-sm">
        <p className="flex flex-wrap items-center gap-2">
          <span className="chip">{STATE_LABEL[m.reviewState]}</span>
          {m.licenseAllowed ? null : <span className="font-medium text-alert">Licence not on the allow-list</span>}
          <span className="text-muted">
            {m.width}×{m.height}px · {m.variants.join(', ')}px · used by {m.usedByRevisions} revision{m.usedByRevisions === 1 ? '' : 's'}
          </span>
        </p>
        <p className="mt-2 break-words"><span className="font-medium">Credit:</span> {m.credit}</p>
        <p className="break-words"><span className="font-medium">Licence:</span> {m.license} · <span className="font-medium">Creator:</span> {m.creator}</p>
        {m.sourceUrl ? (
          <p className="break-all"><span className="font-medium">Source:</span> <a href={m.sourceUrl} rel="noopener noreferrer" className="underline">{m.sourceUrl}</a></p>
        ) : (
          <p className="text-alert">No source page recorded</p>
        )}
        {m.modifications ? <p className="text-muted">Changes: {m.modifications}</p> : null}
        {m.reviewNote ? <p className="text-muted">Review note: {m.reviewNote}</p> : null}
        <p className="mt-1 font-mono text-xs text-muted">id {m.id}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {isAdmin && m.reviewState !== 'approved' && m.licenseAllowed ? (
            <button type="button" disabled={busy} onClick={() => void run('Approved. The image can now be published.', () => staffApi.approveMedia(m.id))} className="btn btn-sm btn-primary">
              Approve
            </button>
          ) : null}
          {isAdmin && m.reviewState !== 'rejected' ? (
            <button type="button" disabled={busy} onClick={reject} className="btn btn-sm btn-danger">
              Reject
            </button>
          ) : null}
          <button type="button" onClick={() => setEditing((v) => !v)} aria-expanded={editing} className="btn btn-sm btn-quiet">
            {editing ? 'Cancel edit' : 'Edit credit or licence'}
          </button>
        </div>
        {editing ? (
          <form onSubmit={save} className="mt-3 grid gap-3 border-t border-rule pt-3 sm:grid-cols-2">
            <MetadataFields m={m} />
            <div className="sm:col-span-2">
              <button disabled={busy} className="btn btn-primary">Save (sends back to review)</button>
            </div>
          </form>
        ) : null}
      </div>
    </article>
  );
}
