'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { GROUP_LABEL } from '@/lib/labels';
import { errorText, type S, staffApi } from '@/lib/staff-api';

export default function AdminHome() {
  const router = useRouter();
  const [species, setSpecies] = useState<S['StaffSpeciesDto'][] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    staffApi.listSpecies().then(setSpecies).catch((e) => setError(errorText(e)));
  }, []);

  async function create(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setError(null);
    try {
      const draft = await staffApi.createSpecies({
        slug: String(f.get('slug')),
        acceptedScientificName: String(f.get('name')),
        rank: 'species',
        displayGroup: String(f.get('group')) as S['CreateSpeciesDto']['displayGroup'],
        locationSensitivity: String(f.get('sensitivity')) as S['CreateSpeciesDto']['locationSensitivity'],
      });
      router.push(`/admin/revisions/${draft.id}`);
    } catch (err) {
      setError(errorText(err));
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold">Species</h1>
      {error ? <p role="alert" className="mt-3 whitespace-pre-line text-sm text-status-cr">{error}</p> : null}
      {species === null ? (
        <p role="status" className="mt-3">Loading…</p>
      ) : species.length === 0 ? (
        <p className="mt-3 italic text-ink-muted">No species yet.</p>
      ) : (
        <ul className="mt-4 divide-y divide-line rounded border border-line bg-white/60">
          {species.map((sp) => {
            const latest = sp.revisions.at(-1);
            return (
              <li key={sp.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2">
                <Link href={`/admin/species/${sp.id}`} className="font-medium italic underline-offset-4 hover:underline">
                  {sp.acceptedScientificName}
                </Link>
                <span className="text-sm text-ink-muted">
                  {sp.publishedRevisionId ? 'Published' : 'Not published'}
                  {latest ? ` · latest v${latest.version} ${latest.state}` : ''}
                </span>
              </li>
            );
          })}
        </ul>
      )}

      <form onSubmit={create} className="mt-8 grid gap-3 rounded border border-line bg-white/60 p-4 sm:grid-cols-2" aria-labelledby="new-h">
        <h2 id="new-h" className="text-lg font-semibold sm:col-span-2">New species</h2>
        <label className="block">
          <span className="text-sm font-medium">Accepted scientific name</span>
          <input name="name" required minLength={3} className="mt-1 w-full rounded border border-line bg-white px-3 py-2" />
        </label>
        <label className="block">
          <span className="text-sm font-medium">URL slug</span>
          <input name="slug" required pattern="[a-z0-9]+(-[a-z0-9]+)*" placeholder="genus-species" className="mt-1 w-full rounded border border-line bg-white px-3 py-2" />
        </label>
        <label className="block">
          <span className="text-sm font-medium">Animal group</span>
          <select name="group" className="mt-1 w-full rounded border border-line bg-white px-3 py-2">
            {Object.entries(GROUP_LABEL).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="text-sm font-medium">Location sensitivity</span>
          <select name="sensitivity" className="mt-1 w-full rounded border border-line bg-white px-3 py-2">
            <option value="none">None</option>
            <option value="generalize_country">Generalize to country</option>
            <option value="hide_regions">Hide all regions</option>
          </select>
        </label>
        <div className="sm:col-span-2">
          <button className="rounded bg-forest px-4 py-2 text-paper hover:bg-forest-light">Create species and draft</button>
        </div>
      </form>
    </div>
  );
}
