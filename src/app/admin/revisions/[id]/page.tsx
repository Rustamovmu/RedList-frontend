'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useStaff } from '@/components/admin/StaffSession';
import { cleanContent, ContentForm } from '@/components/admin/editor/ContentForm';
import { errorText, type S, staffApi } from '@/lib/staff-api';

type Content = S['RevisionContentDto'];

/**
 * Revision screen. The photos, names, written sections, diet tags and numbers are edited in a form
 * (`ContentForm`). The rows that each need a source id — assessments, population estimates, places,
 * habitats, threats, citations and support links — are still edited as JSON under "Advanced", with the
 * source and reference panels below giving the ids to paste in (DECISIONS D-011, D-057). The live preview
 * and the diff against the published version are still to come (see docs/ARCHITECTURE.md).
 */
export default function RevisionPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useStaff();
  const [rev, setRev] = useState<S['RevisionDetailDto'] | null>(null);
  const [content, setContent] = useState<Content | null>(null);
  const [json, setJson] = useState('');
  const [media, setMedia] = useState<S['StaffMediaDto'][]>([]);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const show = useCallback((r: S['RevisionDetailDto']) => {
    setRev(r);
    setContent(r.content);
    setJson(JSON.stringify(r.content, null, 2));
  }, []);

  useEffect(() => {
    staffApi.getRevision(id).then(show).catch((e) => setError(errorText(e)));
  }, [id, show]);

  // Every image, so an attached photo that is pending or rejected can be named as such. Newest 200.
  useEffect(() => {
    staffApi.listMedia().then(setMedia).catch(() => setMedia([]));
  }, []);

  const dirty = useMemo(() => Boolean(rev && content) && JSON.stringify(content) !== JSON.stringify(rev?.content), [content, rev]);

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
    if (!content || !rev) return;
    const body = cleanContent(content);
    const missingAlt = body.media.findIndex((m) => m.altText.trim() === '');
    if (missingAlt >= 0) {
      setNotice(null);
      setError(`Photo ${missingAlt + 1} has no alt text. Describe what the picture shows, so the profile works for people who cannot see it.`);
      return;
    }
    void run('Draft saved.', () => staffApi.saveDraft(id, { ...body, expectedUpdatedAt: rev.updatedAt }));
  }

  function applyJson() {
    let parsed: Content;
    try {
      parsed = JSON.parse(json);
    } catch {
      setError('The content is not valid JSON.');
      return;
    }
    setError(null);
    setNotice('JSON applied to the form. Nothing is saved until you choose "Save draft".');
    setContent(parsed);
  }

  if (!rev || !content) return error ? <p role="alert" className="text-alert">{error}</p> : <p role="status">Loading…</p>;
  const editable = rev.state === 'draft';
  const blockers = rev.checklist.filter((c) => !c.ok && c.blocking);
  const ready = blockers.length === 0;

  return (
    <div>
      <p className="text-sm"><Link href={`/admin/species/${rev.speciesId}`} className="underline underline-offset-4">Back to species</Link></p>
      <h1 className="mt-3 text-3xl font-bold tracking-[-0.02em] text-white">
        {rev.speciesSlug} · version {rev.version}
      </h1>
      <p className="text-sm text-muted">
        State: <strong>{rev.state}</strong>
        {rev.isPublished ? <> · live (<Link href={`/species/${rev.speciesSlug}`} className="underline">view public page</Link>)</> : null}
        {rev.selfReviewed ? ' · self-reviewed' : ''}
        {rev.baseRevisionId ? ' · based on the published version at the time this draft was created' : ''}
      </p>
      {rev.reviewNotes ? <p className="notice mt-4 text-sm text-fog">Review notes: {rev.reviewNotes}</p> : null}

      <div aria-live="polite" className="mt-3">
        {notice ? <p className="text-sm text-lime">{notice}</p> : null}
        {error ? <p role="alert" className="whitespace-pre-line text-sm text-alert">{error}</p> : null}
      </div>

      <section aria-labelledby="check-h" className="panel mt-6 p-5">
        <h2 id="check-h" className="text-lg font-bold text-white">Publication checklist</h2>
        <ul className="mt-3 space-y-1.5 text-sm">
          {rev.checklist.map((c) => (
            <li key={c.key}>
              <span aria-hidden className={`font-bold ${c.ok ? 'text-lime' : c.blocking ? 'text-alert' : 'text-fog'}`}>{c.ok ? '✓' : c.blocking ? '✗' : '!'}</span>{' '}
              <span className="sr-only">{c.ok ? 'Done:' : c.blocking ? 'Missing:' : 'Recommended:'}</span>
              {c.message}
              {!c.ok && !c.blocking ? <span className="chip ml-2 text-muted">recommended, does not block</span> : null}
            </li>
          ))}
        </ul>
        <div className="mt-4 flex flex-wrap gap-2">
          {editable ? (
            <button disabled={busy || !ready || dirty} onClick={() => void run('Submitted for review.', () => staffApi.submit(id))} className="btn btn-primary">
              Submit for review
            </button>
          ) : null}
          {rev.state === 'submitted' && user.role === 'admin' ? (
            <>
              <button disabled={busy} onClick={() => void run('Published.', () => staffApi.publish(id))} className="btn btn-primary">
                Publish
              </button>
              <RequestChanges disabled={busy} onSubmit={(notes) => void run('Changes requested.', () => staffApi.requestChanges(id, notes))} />
            </>
          ) : null}
        </div>
        {editable && dirty ? <p className="mt-2 text-[0.8125rem] text-muted">Save your changes first; the checklist above describes the last saved version.</p> : null}
      </section>

      <section aria-labelledby="content-h" className="mt-8">
        <h2 id="content-h" className="text-lg font-bold text-white">Content</h2>
        <p className="mt-1 text-sm text-muted">
          {editable
            ? 'Change what you need and save. The API validates every field, so nothing invalid can be stored.'
            : 'This revision is not a draft, so it is read-only. Create a new draft from the species page to edit.'}
        </p>

        <div className="mt-4">
          <ContentForm content={content} media={media} onChange={setContent} disabled={!editable || busy} />
        </div>

        <details className="panel mt-5 p-5">
          <summary className="cursor-pointer text-base font-bold text-white">
            Advanced: status, population, places, habitats, threats, citations and support links (JSON)
          </summary>
          <p className="mt-2 text-sm text-muted">
            These rows each need a source id, so they are edited here for now. Use the panels below to find ids. Applying JSON
            replaces everything in the form above, including the photos.
          </p>
          <label htmlFor="content-json" className="sr-only">Revision content as JSON</label>
          <textarea
            id="content-json"
            value={json}
            onChange={(e) => setJson(e.target.value)}
            readOnly={!editable}
            spellCheck={false}
            rows={22}
            className="field mt-3 p-4 font-mono text-xs leading-relaxed"
          />
          <div className="mt-3 flex flex-wrap gap-2">
            {editable ? (
              <button type="button" disabled={busy} onClick={applyJson} className="btn btn-sm btn-secondary">
                Apply this JSON to the form
              </button>
            ) : null}
            <button type="button" onClick={() => setJson(JSON.stringify(content, null, 2))} className="btn btn-sm btn-quiet">
              Show the form&rsquo;s current content
            </button>
          </div>
        </details>

        {editable ? (
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <button disabled={busy} onClick={save} className="btn btn-primary">
              Save draft
            </button>
            {dirty ? <span className="text-sm text-fog">Unsaved changes</span> : <span className="text-sm text-muted">Saved</span>}
          </div>
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
      <input id="review-notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notes for the editor" className="field w-auto py-2 text-sm" />
      <button disabled={disabled || !notes.trim()} onClick={() => onSubmit(notes)} className="btn btn-secondary">
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
    <section aria-labelledby="src-h" className="panel p-5">
      <h2 id="src-h" className="text-lg font-bold text-white">Sources</h2>
      <label className="mt-2 block text-sm">Search
        <input value={q} onChange={(e) => setQ(e.target.value)} className="field mt-1 py-1.5 text-sm" />
      </label>
      <ul className="mt-2 max-h-48 space-y-1 overflow-y-auto text-xs">
        {list.map((s) => (
          <li key={s.id}><code className="select-all">{s.id}</code> {s.title}</li>
        ))}
      </ul>
      <form onSubmit={create} className="mt-3 space-y-2 text-sm">
        <p className="font-medium">New source (sources are never edited; a correction is a new source)</p>
        <input name="title" required minLength={3} placeholder="Title" className="field py-1.5 text-sm" />
        <input name="url" type="url" placeholder="URL" className="field py-1.5 text-sm" />
        <input name="publisher" placeholder="Publisher" className="field py-1.5 text-sm" />
        <div className="flex gap-2">
          <label className="text-xs">Published <input name="publishedOn" type="date" className="field mt-1 px-2 py-1 text-sm" /></label>
          <label className="text-xs">Accessed <input name="accessedOn" type="date" className="field mt-1 px-2 py-1 text-sm" /></label>
        </div>
        <button className="btn btn-sm btn-secondary">Add source</button>
        {error ? <p role="alert" className="whitespace-pre-line text-alert">{error}</p> : null}
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
    <section aria-labelledby="ref-h" className="panel p-5">
      <h2 id="ref-h" className="text-lg font-bold text-white">Reference ids</h2>
      <label className="mt-2 block text-sm">Find a region, habitat, threat, image or support link
        <input value={q} onChange={(e) => setQ(e.target.value)} className="field mt-1 py-1.5 text-sm" />
      </label>
      {/* Scrollable, so it must take keyboard focus to be scrolled without a mouse (WCAG 2.1.1; axe scrollable-region-focusable). */}
      <ul tabIndex={0} aria-label="Matching reference ids" className="mt-2 max-h-72 space-y-1 overflow-y-auto text-xs">        {rows.map((r) => (
          <li key={r.id}><code className="select-all">{r.id}</code> <span className="text-muted">{r.kind}</span> {r.label}</li>
        ))}
      </ul>
    </section>
  );
}
