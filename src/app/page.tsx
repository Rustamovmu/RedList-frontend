import Link from 'next/link';
import { connection } from 'next/server';
import { SpeciesCard } from '@/components/SpeciesCard';
import { apiGet } from '@/lib/api';
import { ENVIRONMENT_LABEL, GROUP_LABEL } from '@/lib/labels';

/**
 * Home (PLAN §4). Every number comes from the database and says "in this catalogue": never a global total.
 * The hero has no photograph yet: no licensed hero image exists, and one is never invented (media lands in M4).
 */
export default async function Home() {
  // Render per request (never prerendered at build, when the API may be down). Data stays cached by tag.
  await connection();
  const [filters, threatened] = await Promise.all([
    apiGet('/api/v1/filters', { tags: ['catalogue'] }).catch(() => null),
    apiGet('/api/v1/species', { query: { category: 'CR,EN,VU', sort: 'status', pageSize: '4' }, tags: ['catalogue'] }).catch(() => null),
  ]);
  const groups = filters?.groups.filter((g) => g.count > 0) ?? [];
  const environments = filters?.environments.filter((e) => e.count > 0) ?? [];
  const places = [...(filters?.regions ?? [])].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name)).slice(0, 8);

  return (
    <div>
      <section className="bg-forest text-paper">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:py-20">
          <h1 className="max-w-3xl text-4xl font-semibold leading-tight sm:text-5xl">
            Understand a species, discover where it lives, and find a credible way to help.
          </h1>
          <form action="/species" method="get" role="search" className="mt-8 flex max-w-xl flex-wrap gap-2">
            <label htmlFor="home-q" className="sr-only">Search species by name</label>
            <input
              id="home-q"
              name="q"
              type="search"
              placeholder="Search by common or scientific name"
              className="min-w-0 flex-1 basis-60 rounded border border-paper/40 bg-paper px-4 py-3 text-ink"
            />
            <button className="rounded border border-paper bg-paper px-5 py-3 font-medium text-forest hover:bg-paper-deep">Search</button>
          </form>
          {filters ? (
            <p className="mt-6 text-sm text-paper/90">
              {filters.total} species in this catalogue, {filters.threatened} of them threatened (Critically Endangered, Endangered or Vulnerable).
            </p>
          ) : null}
        </div>
      </section>

      <div className="mx-auto max-w-6xl space-y-14 px-4 py-12">
        {filters === null ? (
          <p role="alert" className="rounded border border-status-cr p-4">The catalogue could not be loaded right now. Search still works.</p>
        ) : null}

        {groups.length ? (
          <section aria-labelledby="by-group">
            <h2 id="by-group" className="text-2xl font-semibold">Browse by animal group</h2>
            <ul className="mt-4 flex flex-wrap gap-2">
              {groups.map((g) => (
                <li key={g.value}>
                  <Link href={`/species?group=${g.value}`} className="inline-block rounded-full border border-line bg-white/70 px-4 py-2 hover:border-forest">
                    {GROUP_LABEL[g.value as keyof typeof GROUP_LABEL] ?? g.value} <span className="text-ink-muted">({g.count})</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {environments.length ? (
          <section aria-labelledby="by-env">
            <h2 id="by-env" className="text-2xl font-semibold">Browse by environment</h2>
            <p className="mt-1 text-sm text-ink-muted">Group and environment are separate: a whale is a mammal and marine.</p>
            <ul className="mt-4 flex flex-wrap gap-2">
              {environments.map((e) => (
                <li key={e.value}>
                  <Link href={`/species?environment=${e.value}`} className="inline-block rounded-full border border-line bg-white/70 px-4 py-2 hover:border-forest">
                    {ENVIRONMENT_LABEL[e.value] ?? e.value} <span className="text-ink-muted">({e.count})</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {threatened?.items.length ? (
          <section aria-labelledby="threatened">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 id="threatened" className="text-2xl font-semibold">Threatened species in this catalogue</h2>
              <Link href="/species?category=CR&category=EN&category=VU&sort=status" className="text-sm underline underline-offset-4">See all threatened</Link>
            </div>
            <ul className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {threatened.items.map((c) => (
                <li key={c.slug}>
                  <SpeciesCard card={c} />
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {places.length ? (
          <section aria-labelledby="places">
            <h2 id="places" className="text-2xl font-semibold">Explore by country, sea or ocean</h2>
            <ul className="mt-4 flex flex-wrap gap-2">
              {places.map((r) => (
                <li key={r.slug}>
                  <Link href={`/regions/${r.slug}`} className="inline-block rounded-full border border-line bg-white/70 px-4 py-2 hover:border-forest">
                    {r.name} <span className="text-ink-muted">({r.count})</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <section aria-labelledby="how" className="rounded-lg border border-line bg-white/60 p-6">
          <h2 id="how" className="text-2xl font-semibold">How we source facts</h2>
          <ul className="mt-3 list-inside list-disc space-y-1">
            <li>Every number and status links to the source it came from, with the source&apos;s own date.</li>
            <li>Population estimates keep their units, places and years, and unknown is never shown as zero.</li>
            <li>Each profile is reviewed by our editors before it is published, and the review date is shown.</li>
          </ul>
        </section>
      </div>
    </div>
  );
}
