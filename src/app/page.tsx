import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { connection } from 'next/server';
import { SectionHead } from '@/components/SectionHead';
import { SpeciesCard } from '@/components/SpeciesCard';
import { apiGet } from '@/lib/api';
import { ENVIRONMENT_LABEL, GROUP_LABEL } from '@/lib/labels';
import { mediaSrc } from '@/lib/media';
import { absolute, jsonLd, SITE_NAME } from '@/lib/site';

/**
 * Home (PLAN §4). Every number comes from the database and says "in this catalogue": never a global total.
 * The hero photo, when there is one, is a catalogue image with its credit: never a stock or invented image.
 */
export const metadata: Metadata = { alternates: { canonical: '/' } };

const RULES = [
  'Every number and status links to the source it came from, with the source’s own date.',
  'Population estimates keep their units, places and years, and unknown is never shown as zero.',
  'Each profile is reviewed by our editors before it is published, and the review date is shown.',
];

export default async function Home() {
  // Render per request (never prerendered at build, when the API may be down). Data stays cached by tag.
  await connection();
  const [filters, threatened] = await Promise.all([
    apiGet('/api/v1/filters', { tags: ['catalogue'] }).catch(() => null),
    apiGet('/api/v1/species', { query: { category: 'CR,EN,VU', sort: 'status', pageSize: '5' }, tags: ['catalogue'] }).catch(() => null),
  ]);
  // The hero photo is the first threatened species that has an approved, licensed photo. Never a stock or invented image.
  const hero = threatened?.items.find((c) => c.image) ?? null;
  const groups = filters?.groups.filter((g) => g.count > 0) ?? [];
  const environments = filters?.environments.filter((e) => e.count > 0) ?? [];
  const places = [...(filters?.regions ?? [])].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name)).slice(0, 10);
  const cards = threatened?.items ?? [];

  // schema.org WebSite with the site search, so search engines can offer a search box for the catalogue.
  const site = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SITE_NAME,
    url: absolute('/'),
    potentialAction: { '@type': 'SearchAction', target: { '@type': 'EntryPoint', urlTemplate: absolute('/species?q={search_term_string}') }, 'query-input': 'required name=search_term_string' },
  };

  return (
    <div className="flush-bottom">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(site) }} />

      {/* ---------- hero: the name frames the animal; the header's nav row floats over it ---------- */}
      <section aria-labelledby="hero-h" className="relative -mt-[var(--nav-h)] flex min-h-[max(34rem,calc(100svh-2.75rem))] flex-col overflow-hidden border-b border-lime bg-black">
        {hero?.image ? (
          <figure className="absolute inset-0 m-0">
            <Image
              src={mediaSrc(hero.image.storageKey)}
              alt={hero.image.altText}
              fill
              priority
              sizes="100vw"
              className="object-cover brightness-[0.62] saturate-[0.85]"
            />
            {/* Dark scrims at the top and bottom keep the nav, the name and the captions readable on any photo. */}
            <div aria-hidden className="absolute inset-0 bg-[linear-gradient(to_bottom,rgb(0_0_0/0.75),transparent_32%,transparent_58%,rgb(0_0_0/0.85))]" />
            <figcaption className="absolute inset-x-0 bottom-0 z-20">
              <div className="wrap flex flex-wrap items-end justify-between gap-x-6 gap-y-1 pb-5 font-mono text-xs leading-relaxed text-lime sm:text-[0.8125rem]">
                <span className="max-w-[60ch]">{hero.image.credit}</span>
                <Link href={`/species/${hero.slug}`} className="inline-flex min-h-8 items-center underline underline-offset-4 hover:decoration-2">
                  {hero.commonName ?? <i>{hero.scientificName}</i>}
                </Link>
              </div>
            </figcaption>
          </figure>
        ) : (
          <div aria-hidden className="grid-bg absolute inset-0" />
        )}
        <h1 id="hero-h" className="pointer-events-none relative z-10 flex flex-1 flex-col items-center justify-between pt-[var(--nav-h)] pb-32 text-lime sm:pb-20">
          <span className="sr-only">Wildward</span>
          <span aria-hidden className="hero-word type-display text-[min(31vw,28svh)] leading-[0.82]">Wild</span>
          {hero?.image ? null : (
            <span aria-hidden className="max-w-[34ch] px-5 text-center font-mono text-sm text-fog sm:text-base">
              a free field guide to threatened wildlife, with every fact cited
            </span>
          )}
          <span aria-hidden className="hero-word hero-word-late type-display text-[min(31vw,28svh)] leading-[0.82]">Ward</span>
        </h1>
      </section>

      {/* ---------- promise, search and catalogue counts ---------- */}
      <section aria-label="Search the catalogue" className="border-b border-rule">
        <div className="wrap grid gap-12 py-16 lg:grid-cols-[1.15fr_1fr] lg:gap-24 lg:py-24">
          <p className="max-w-[22ch] text-[clamp(1.75rem,3.2vw,2.5rem)] font-medium leading-[1.15] tracking-[-0.01em] text-white">
            Understand a species, discover where it lives, and find a credible way to help.
          </p>
          <div className="self-end">
            <form action="/species" method="get" role="search" className="flex items-end gap-3">
              <label htmlFor="home-q" className="sr-only">Search species by name</label>
              <input id="home-q" name="q" type="search" placeholder="Search by common or scientific name" className="field-search min-w-0 flex-1" />
              <button className="btn btn-primary">Search</button>
            </form>
            {filters ? (
              <dl className="mt-10 grid grid-cols-2 gap-6">
                <div className="flex flex-col-reverse gap-1">
                  <dt className="label">Species in this catalogue</dt>
                  <dd className="type-display text-[clamp(3rem,5vw,4.5rem)] leading-none text-lime">{filters.total}</dd>
                </div>
                <div className="flex flex-col-reverse gap-1">
                  <dt className="label">Threatened (CR, EN or VU)</dt>
                  <dd className="type-display text-[clamp(3rem,5vw,4.5rem)] leading-none text-lime">{filters.threatened}</dd>
                </div>
              </dl>
            ) : null}
          </div>
        </div>
      </section>

      <div className="wrap space-y-24 py-20 lg:space-y-32 lg:py-28">
        {filters === null ? (
          <p role="alert" className="notice-error">The catalogue could not be loaded right now. Search still works.</p>
        ) : null}

        {groups.length ? (
          <section aria-labelledby="by-group">
            <SectionHead id="by-group" title="Browse by animal group" />
            <ul className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
              {groups.map((g) => (
                <li key={g.value}>
                  <Link href={`/species?group=${g.value}`} className="group flex aspect-square flex-col justify-between border border-rule bg-panel p-4 hover:border-lime hover:bg-raised">
                    <span className="font-mono text-sm font-bold uppercase tracking-[0.08em] text-white">
                      {GROUP_LABEL[g.value as keyof typeof GROUP_LABEL] ?? g.value}
                    </span>
                    <span className="flex items-baseline gap-2">
                      <span className="type-display text-5xl leading-none text-lime">{g.count}</span>
                      <span className="font-mono text-xs text-muted">species</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {environments.length ? (
          <section aria-labelledby="by-env">
            <SectionHead id="by-env" title="Browse by environment" />
            <p className="mt-4 max-w-[60ch] text-muted">Group and environment are separate: a whale is a mammal and marine.</p>
            <ul className="mt-8 border-t border-rule">
              {environments.map((e) => (
                <li key={e.value} className="border-b border-rule">
                  <Link href={`/species?environment=${e.value}`} className="group flex items-center justify-between gap-6 py-3 sm:py-4">
                    <span className="type-display min-w-0 text-[clamp(2.25rem,9vw,6.5rem)] leading-[0.95] text-muted group-hover:text-lime group-focus-visible:text-lime">
                      {ENVIRONMENT_LABEL[e.value] ?? e.value}
                    </span>
                    <span className="shrink-0 font-mono text-sm text-fog group-hover:text-lime">{e.count} species</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {cards.length ? (
          <section aria-labelledby="threatened">
            <SectionHead
              id="threatened"
              title="Threatened species in this catalogue"
              aside={<Link href="/species?category=CR&category=EN&category=VU&sort=status" className="btn btn-sm btn-secondary">See all threatened</Link>}
            />
            <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {cards.map((c, i) => (
                <li key={c.slug} className={i === 0 ? 'sm:col-span-2 lg:row-span-2' : ''}>
                  <SpeciesCard card={c} feature={i === 0} eager={c.slug === hero?.slug} />
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </div>

      {places.length ? (
        <section aria-labelledby="places" className="border-y border-rule bg-panel">
          <div className="wrap py-20 lg:py-24">
            <SectionHead id="places" title="Explore by country, sea or ocean" aside={<Link href="/map" className="btn btn-sm btn-secondary">Open the map</Link>} />
            <ul className="mt-10 flex flex-wrap gap-3">
              {places.map((r) => (
                <li key={r.slug}>
                  <Link href={`/regions/${r.slug}`} className="inline-flex min-h-12 items-center gap-2 border border-muted px-5 font-mono text-sm uppercase tracking-[0.08em] text-white hover:border-lime hover:text-lime">
                    {r.name} <span className="text-muted">({r.count})</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>
      ) : null}

      <section aria-labelledby="how" className="on-lime bg-lime text-black">
        <div className="wrap py-20 lg:py-24">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <h2 id="how" className="type-display text-[clamp(2.75rem,7vw,6rem)]">How we source facts</h2>
            <Link href="/methodology" className="inline-flex min-h-11 items-center font-mono text-sm font-bold uppercase tracking-[0.08em] underline underline-offset-4">
              Read the methodology
            </Link>
          </div>
          <ol className="mt-12 grid gap-10 md:grid-cols-3 md:gap-8">
            {RULES.map((r, i) => (
              <li key={r} className="border-t-2 border-black pt-4">
                <span aria-hidden className="font-mono text-sm font-bold">0{i + 1}</span>
                <p className="mt-6 max-w-[34ch] text-lg font-medium leading-snug">{r}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>
    </div>
  );
}
