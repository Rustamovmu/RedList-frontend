'use client';

import { useMemo, useState } from 'react';
import { type S, staffApi } from '@/lib/staff-api';

type MediaInput = S['RevisionContentDto']['media'][number];
type Media = S['StaffMediaDto'];

const STATE_LABEL: Record<Media['reviewState'], string> = { pending: 'Pending review', approved: 'Approved', rejected: 'Rejected' };

/**
 * The photos of one draft. The first photo is the primary one: that is the picture the home page, the
 * cards and the profile hero use (`ORDER BY (role = 'primary') DESC, position` in catalogue-sql.ts), so the
 * order here is what visitors see. Only approved images can be published, and the API blocks the rest.
 * Thumbnails come from the staff preview route, which needs the session cookie and serves any review state.
 */
export function PhotoPicker({
  photos, media, onChange, disabled,
}: {
  photos: MediaInput[];
  media: Media[];
  onChange: (v: MediaInput[]) => void;
  disabled?: boolean;
}) {
  const [adding, setAdding] = useState(false);
  const [q, setQ] = useState('');
  const byId = useMemo(() => new Map(media.map((m) => [m.id, m])), [media]);

  const attached = new Set(photos.map((p) => p.mediaId));
  const candidates = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return media
      .filter((m) => m.reviewState === 'approved' && !attached.has(m.id))
      .filter((m) => !needle || m.credit.toLowerCase().includes(needle) || m.creator.toLowerCase().includes(needle))
      .slice(0, 12);
    // `attached` is derived from `photos`, which is in the dependency list.
  }, [media, q, photos]); // eslint-disable-line react-hooks/exhaustive-deps

  function set(i: number, patch: Partial<MediaInput>) {
    onChange(photos.map((p, j) => (j === i ? { ...p, ...patch } : p)));
  }
  function move(i: number, by: -1 | 1) {
    const next = [...photos];
    const to = i + by;
    if (to < 0 || to >= next.length) return;
    [next[i], next[to]] = [next[to], next[i]];
    onChange(next);
  }
  function add(m: Media) {
    onChange([...photos, { mediaId: m.id, position: photos.length, role: photos.length === 0 ? 'primary' : 'gallery', altText: '', caption: null }]);
    setAdding(false);
    setQ('');
  }

  return (
    <div className="grid gap-4">
      {photos.length === 0 ? (
        <p className="text-sm italic text-muted">
          No photo yet. The profile and the cards then show the neutral &ldquo;no photo&rdquo; state, which is allowed.
        </p>
      ) : (
        <ol className="grid gap-4">
          {photos.map((p, i) => {
            const m = byId.get(p.mediaId);
            return (
              <li key={p.mediaId} className="grid gap-4 border border-rule p-4 sm:grid-cols-[140px_1fr]">
                <div>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={staffApi.mediaPreviewUrl(p.mediaId, 320)}
                    alt=""
                    width={140}
                    height={m ? Math.round((140 * m.height) / m.width) : 105}
                    className="h-auto w-full border border-rule bg-black"
                  />
                  <p className="mt-1.5 text-xs">
                    <span className={`chip ${i === 0 ? 'border-lime text-lime' : 'text-muted'}`}>{i === 0 ? 'Main photo' : `Photo ${i + 1}`}</span>
                  </p>
                </div>
                <div className="min-w-0 grid gap-3">
                  {m ? (
                    <p className="text-[0.8125rem] text-muted">
                      {m.credit} · {m.license} ·{' '}
                      <span className={m.reviewState === 'approved' ? 'text-lime' : 'text-alert'}>{STATE_LABEL[m.reviewState]}</span>
                      {m.reviewState !== 'approved' ? ' — publishing is blocked until an admin approves it' : ''}
                    </p>
                  ) : (
                    <p className="text-[0.8125rem] text-muted">Image {p.mediaId.slice(0, 8)}… (details not in the loaded list)</p>
                  )}
                  <label className="block">
                    <span className="text-sm font-medium">
                      Alt text<span className="text-lime"> *</span>
                    </span>
                    <span className="mt-0.5 block text-[0.8125rem] text-muted">
                      What the picture shows, for people who cannot see it. Do not start with &ldquo;Photo of&rdquo;.
                    </span>
                    <input
                      value={p.altText}
                      onChange={(e) => set(i, { altText: e.target.value })}
                      disabled={disabled}
                      maxLength={300}
                      required
                      aria-invalid={p.altText.trim() === ''}
                      className="field mt-1"
                    />
                  </label>
                  <label className="block">
                    <span className="text-sm font-medium">Caption <span className="text-muted">(optional)</span></span>
                    <input
                      value={p.caption ?? ''}
                      onChange={(e) => set(i, { caption: e.target.value || null })}
                      disabled={disabled}
                      maxLength={500}
                      className="field mt-1"
                    />
                  </label>
                  <span className="flex flex-wrap gap-2">
                    <button type="button" disabled={disabled || i === 0} onClick={() => move(i, -1)} className="btn btn-sm btn-quiet">
                      Move up
                    </button>
                    <button type="button" disabled={disabled || i === photos.length - 1} onClick={() => move(i, 1)} className="btn btn-sm btn-quiet">
                      Move down
                    </button>
                    <button type="button" disabled={disabled} onClick={() => onChange(photos.filter((_, j) => j !== i))} className="btn btn-sm btn-quiet">
                      Remove
                    </button>
                  </span>
                </div>
              </li>
            );
          })}
        </ol>
      )}

      <div>
        <button type="button" disabled={disabled} aria-expanded={adding} onClick={() => setAdding((v) => !v)} className="btn btn-sm btn-secondary">
          {adding ? 'Cancel' : 'Add a photo'}
        </button>
        {adding ? (
          <div className="mt-3 border border-rule p-4">
            <label className="block text-sm">
              Search the approved images by creator or credit
              <input value={q} onChange={(e) => setQ(e.target.value)} className="field mt-1 py-1.5 text-sm" />
            </label>
            <p className="mt-2 text-[0.8125rem] text-muted">
              Only approved images are offered. Upload a new one on the <a href="/admin/media" className="underline">Media</a> page first.
            </p>
            {candidates.length === 0 ? (
              <p className="mt-3 text-sm italic text-muted">No approved image matches.</p>
            ) : (
              <ul className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {candidates.map((m) => (
                  <li key={m.id} className="border border-rule p-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={staffApi.mediaPreviewUrl(m.id, 320)} alt="" width={200} height={Math.round((200 * m.height) / m.width)} className="h-auto w-full bg-black" />
                    <p className="mt-1.5 line-clamp-2 text-xs text-muted">{m.credit}</p>
                    <button type="button" onClick={() => add(m)} className="btn btn-sm btn-secondary mt-2">
                      Use this photo
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}
