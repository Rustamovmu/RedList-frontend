'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useStaff } from '@/components/admin/StaffSession';
import { errorText, type S, staffApi } from '@/lib/staff-api';

/**
 * Revision screen. In M1 the content is edited as structured JSON validated by the API (DECISIONS D-011);
 * the side panels give the ids of sources and reference rows to paste in. The form-based editor with live
 * preview and a diff against the published version is still to come (see docs/ARCHITECTURE.md).
 */
export default function RevisionPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useStaff();
  const [rev, setRev] = useState<S['RevisionDetailDto'] | null>(null);
  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const show = useCallback((r: S['RevisionDetailDto']) => {
    setRev(r);
    setText(JSON.stringify(r.content, null, 2));
  }, []);

  useEffect(() => {
    staffApi.getRevision(id).then(show).catch((e) => setError(errorText(e)));
  }, [id, show]);

  async function run(label: string, fn: () => Promise<S['RevisionDetailDto']>) {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      show(await fn());
      setNotice(label);
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  }

  function save() {
    let content: S['RevisionContentDto'];
    try {
      content = JSON.parse(text);
    } catch {
      setError('The content is not valid JSON.');
      return;
    }
    run('Draft saved.', () => staffApi.saveDraft(id, { ...content, expectedUpdatedAt: rev!.updatedAt }));
  }

  if (!rev) return error ? <p role="alert" className="text-status-cr">{error}</p> : <p role="status">Loading…</p>;
  const editable = rev.state === 'draft';
  const ready = rev.checklist.every((c) => c.ok);

  return (
    <div>
      <p className="text-sm"><Link href={`/admin/species/${rev.speciesId}`} className="underline underline-offset-4">Back to species</Link></p>
      <h1 className="mt-2 text-2xl font-semibold">
        {rev.speciesSlug} · version {rev.version}
      </h1>
      <p className="text-sm text-ink-muted">
        State: <strong>{rev.state}</strong>
        {rev.isPublished ? <> · live (<Link href={`/species/${rev.speciesSlug}`} className="underline">view public page</Link>)</> : null}
        {rev.selfReviewed ? ' · self-reviewed' : ''}
        {rev.baseRevisionId ? ' · based on the published version at the time this draft was created' : ''}
      </p>
      {rev.reviewNotes ? <p className="mt-2 rounded border border-status-vu p-2 text-sm">Review notes: {rev.reviewNotes}</p> : null}

      <div aria-live="polite" className="mt-3">
        {notice ? <p className="text-sm text-status-lc">{notice}</p> : null}
        {error ? <p role="alert" className="whitespace-pre-line text-sm text-status-cr">{error}</p> : null}
      </div>

      <section aria-labelledby="check-h" className="mt-6 rounded border border-line bg-white/60 p-4">
        <h2 id="check-h" className="font-semibold">Publication checklist</h2>
        <ul className="mt-2 space-y-1 text-sm">
          {rev.checklist.map((c) => (
            <li key={c.key}>
              <span aria-hidden>{c.ok ? '✓' : '✗'}</span> <span className="sr-only">{c.ok ? 'Done:' : 'Missing:'}</span> {c.message}
            </li>
          ))}
        </ul>
        <div className="mt-4 flex flex-wrap gap-2">
          {editable ? (
            <button disabled={busy || !ready} onClick={() => run('Submitted for review.', () => staffApi.submit(id))} className="rounded bg-forest px-4 py-2 text-paper disabled:opacity-50">
              Submit for review
            </button>
          ) : null}
          {rev.state === 'submitted' && user.role === 'admin' ? (
            <>
              <button disabled={busy} onClick={() => run('Published.', () => staffApi.publish(id))} className="rounded bg-forest px-4 py-2 text-paper disabled:opacity-50">
                Publish
              </button>
              <RequestChanges disabled={busy} onSubmit={(notes) => run('Changes requested.', () => staffApi.requestChanges(id, notes))} />
            </>
          ) : null}
        </div>
      </section>

      <section aria-labelledby="content-h" className="mt-6">
        <h2 id="content-h" className="font-semibold">Content</h2>
        <p className="text-sm text-ink-muted">
          {editable ? 'Edit the JSON and save. The API validates every field.' : 'This revision is not a draft, so it is read-only. Create a new draft from the species page to edit.'}
        </p>
        <label htmlFor="content-json" className="sr-only">Revision content as JSON</label>
        <textarea
          id="content-json"
          value={text}
          onChange={(e) => setText(e.target.value)}
          readOnly={!editable}
          spellCheck={false}
          rows={28}
          className="mt-2 w-full rounded border border-line bg-white p-3 font-mono text-xs"
        />
        {editable ? (
          <button disabled={busy} onClick={save} className="mt-2 rounded bg-forest px-4 py-2 text-paper disabled:opacity-50">
            Save draft
          </button>
        ) : null}
      </section>

      <div className="mt-8 grid gap-6 md:grid-cols-2">
        <SourcesPanel />
        <ReferencePanel />
      </div>
    </div>
  );
}

function RequestChanges({ disabled, onSubmit }: { disabled: boolean; onSubmit: (notes: string) => void }) {
  const [notes, setNotes] = useState('');
  return (
    <span className="flex flex-wrap items-center gap-2">
      <label className="sr-only" htmlFor="review-notes">Notes for the editor</label>
      <input id="review-notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notes for the editor" className="rounded border border-line bg-white px-2 py-2 text-sm" />
      <button disabled={disabled || !notes.trim()} onClick={() => onSubmit(notes)} className="rounded border border-forest px-4 py-2 text-forest disabled:opacity-50">
        Request changes
      </button>
    </span>
  );
}

function SourcesPanel() {
  const [q, setQ] = useState('');
  const [list, setList] = useState<S['SourceDto'][]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => staffApi.listSources(q || undefined).then(setList).catch((e) => setError(errorText(e))), 250);
    return () => clearTimeout(t);
  }, [q]);

  async function create(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const f = new FormData(form);
    const opt = (k: string) => String(f.get(k) ?? '').trim() || null;
    try {
      const s = await staffApi.createSource({ title: String(f.get('title')), url: opt('url'), publisher: opt('publisher'), publishedOn: opt('publishedOn'), accessedOn: opt('accessedOn') });
      setList((l) => [s, ...l]);
      form.reset();
      setError(null);
    } catch (err) {
      setError(errorText(err));
    }
  }

  return (
    <section aria-labelledby="src-h" className="rounded border border-line bg-white/60 p-4">
      <h2 id="src-h" className="font-semibold">Sources</h2>
      <label className="mt-2 block text-sm">Search
        <input value={q} onChange={(e) => setQ(e.target.value)} className="mt-1 block w-full rounded border border-line bg-white px-2 py-1" />
      </label>
      <ul className="mt-2 max-h-48 space-y-1 overflow-y-auto text-xs">
        {list.map((s) => (
          <li key={s.id}><code className="select-all">{s.id}</code> {s.title}</li>
        ))}
      </ul>
      <form onSubmit={create} className="mt-3 space-y-2 text-sm">
        <p className="font-medium">New source (sources are never edited; a correction is a new source)</p>
        <input name="title" required minLength={3} placeholder="Title" className="block w-full rounded border border-line bg-white px-2 py-1" />
        <input name="url" type="url" placeholder="URL" className="block w-full rounded border border-line bg-white px-2 py-1" />
        <input name="publisher" placeholder="Publisher" className="block w-full rounded border border-line bg-white px-2 py-1" />
        <div className="flex gap-2">
          <label className="text-xs">Published <input name="publishedOn" type="date" className="block rounded border border-line bg-white px-1" /></label>
          <label className="text-xs">Accessed <input name="accessedOn" type="date" className="block rounded border border-line bg-white px-1" /></label>
        </div>
        <button className="rounded border border-forest px-3 py-1 text-forest">Add source</button>
        {error ? <p role="alert" className="whitespace-pre-line text-status-cr">{error}</p> : null}
      </form>
    </section>
  );
}

function ReferencePanel() {
  const [ref, setRef] = useState<S['ReferenceListsDto'] | null>(null);
  const [q, setQ] = useState('');
  useEffect(() => {
    staffApi.reference().then(setRef).catch(() => setRef(null));
  }, []);
  const rows = useMemo(() => {
    if (!ref) return [];
    const all = [
      ...ref.regions.map((r) => ({ kind: `region (${r.type})`, id: r.id, label: r.name })),
      ...ref.habitats.map((h) => ({ kind: 'habitat', id: h.id, label: `${h.code} ${h.name}` })),
      ...ref.threats.map((t) => ({ kind: 'threat', id: t.id, label: `${t.code} ${t.name}` })),
      ...ref.media.map((m) => ({ kind: `media (${m.reviewState}, ${m.license})`, id: m.id, label: m.credit })),
      ...ref.supportLinks.map((l) => ({ kind: `support link (${l.editorialStatus})`, id: l.id, label: `${l.organizationName} ${l.url}` })),
    ];
    const needle = q.trim().toLowerCase();
    return needle ? all.filter((r) => r.label.toLowerCase().includes(needle) || r.kind.includes(needle)).slice(0, 50) : all.slice(0, 20);
  }, [ref, q]);

  return (
    <section aria-labelledby="ref-h" className="rounded border border-line bg-white/60 p-4">
      <h2 id="ref-h" className="font-semibold">Reference ids</h2>
      <label className="mt-2 block text-sm">Find a region, habitat, threat, image or support link
        <input value={q} onChange={(e) => setQ(e.target.value)} className="mt-1 block w-full rounded border border-line bg-white px-2 py-1" />
      </label>
      {/* Scrollable, so it must take keyboard focus to be scrolled without a mouse (WCAG 2.1.1; axe scrollable-region-focusable). */}
      <ul tabIndex={0} aria-label="Matching reference ids" className="mt-2 max-h-72 space-y-1 overflow-y-auto text-xs">        {rows.map((r) => (
          <li key={r.id}><code className="select-all">{r.id}</code> <span className="text-ink-muted">{r.kind}</span> {r.label}</li>
        ))}
      </ul>
    </section>
  );
}
