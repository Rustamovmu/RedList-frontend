import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { connection } from 'next/server';
import { GroupTile } from '@/components/GroupTile';
import { type GlobeEntry, SpeciesGlobe } from '@/components/home/SpeciesGlobe';
import { SourceCards } from '@/components/home/SourceCards';
import { SpeciesStrip } from '@/components/home/SpeciesStrip';
import { AlertIcon, BranchIcon, GlobeIcon, GuideIcon } from '@/components/home/StatIcons';
import { HeroCurve } from '@/components/shell/Curves';
import { Chevron, GridIcon, SearchIcon } from '@/components/shell/Icons';
import { SectionHead } from '@/components/SectionHead';
import { SpeciesCard } from '@/components/SpeciesCard';
import { WholePhoto } from '@/components/WholePhoto';
import type { components } from '@/contracts/api';
import { apiGet } from '@/lib/api';
import { ENVIRONMENT_LABEL } from '@/lib/labels';
import { mediaSrc } from '@/lib/media';
import { absolute, jsonLd, SITE_NAME } from '@/lib/site';

/**
 * Home (PLAN §4), laid out like the owner's reference site (D-038): a photo hero with the promise and a search box,
 * the catalogue in numbers, then photo-led sections. Every number comes from the database and says "in this catalogue",
 * never a global total. Below the hero every photo is a catalogue image, captioned with the species it shows; photographers
 * and licences are listed on /credits, linked from the footer (D-055). The hero image is the owner's choice (DECISIONS D-041).
 * After the numbers come two full-screen sections the owner asked for: a photo strip (D-067, which replaced the photo
 * wall of D-063) and a globe (D-064). Then "How we source facts" shows its three rules, and then four threatened species, as pinned photo cards (D-068).
 */
export const metadata: Metadata = { alternates: { canonical: '/' } };

type Card = components['schemas']['SpeciesCardDto'];
type Pin = components['schemas']['SpeciesPinDto'];

const THREATENED_HREF = '/species?category=CR&category=EN&category=VU&sort=status';

/**
 * The hero image: the owner's collage of eight close-ups (D-041), a fixed file in /public served from our own domain.
 * Its creator and licence are not yet known, so nothing here names a photographer or a licence.
 */
const HERO_IMAGE = {
  src: '/hero/wild-faces.webp',
  alt: 'Close-ups of eight animal faces side by side: a lion, a bee, an orangutan, a spotted big cat, a gorilla, a cheetah, a fish and an owl.',
};

/**
 * Photos on the home photo strip (SpeciesStrip, D-067). The filmstrip reads best with 8 to 24 frames; 10 keeps each
 * thumbnail wide enough to recognise on a laptop, and about 2.6 rem wide on a 360 px phone.
 */
const STRIP_SIZE = 10;

/** The strip takes the threatened categories in turn, so neighbouring photos do not all read "Critically Endangered". */
const STRIP_CATEGORIES = ['CR', 'EN', 'VU'] as const;

/**
 * The strip's photos, taken after every other photo section so those keep their picks: threatened species whose photo
 * is not already on the page. Any photo shape will do, because the strip shows each one whole (D-039). Frame by frame,
 * the strip wants the next category in turn (of CR, EN and VU, those the pool has) and an animal group it does not have
 * yet, and gives up those wishes in that order when nothing matches. Photos that are not on a group tile come first.
 * Shown in the order picked, so neighbouring frames differ.
 */
function stripPicks(pool: Card[], used: Set<string>, onTiles: Set<string>): Card[] {
  const free = pool.filter((c) => c.image && !used.has(c.slug));
  const ordered = [...free.filter((c) => !onTiles.has(c.slug)), ...free.filter((c) => onTiles.has(c.slug))];
  const categories = STRIP_CATEGORIES.filter((cat) => ordered.some((c) => c.status?.category === cat));
  const strip: Card[] = [];
  for (let slot = 0; slot < STRIP_SIZE; slot++) {
    const category = categories.length ? categories[slot % categories.length] : null;
    const groups = new Set(strip.map((c) => c.displayGroup));
    const left = ordered.filter((c) => !strip.includes(c));
    const pick =
      left.find((c) => c.status?.category === category && !groups.has(c.displayGroup)) ??
      left.find((c) => !groups.has(c.displayGroup)) ??
      left.find((c) => c.status?.category === category) ??
      left[0];
    if (!pick) break;
    strip.push(pick);
    used.add(pick.slug);
  }
  return strip;
}

/** Pins on the home globe (SpeciesGlobe, D-064). */
const GLOBE_SIZE = 8;

/** Angle between two points on the globe, in degrees (haversine). */
function arcDegrees(a: Pin, b: Pin): number {
  const rad = Math.PI / 180;
  const h = Math.sin(((b.lat - a.lat) * rad) / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(((b.lng - a.lng) * rad) / 2) ** 2;
  return (2 * Math.asin(Math.min(1, Math.sqrt(h)))) / rad;
}

/**
 * The globe's species, taken after the strip: threatened species whose photo is not already on the page and that have a
 * pin (GET /map/pins: a point inside a place where they live; species with hidden locations never have one).
 * Pins must not cover each other: a pin is about 12° of arc wide at the middle of the globe, 17° when it is featured,
 * so each new pin keeps 20° from the others, then 10° if candidates run short; a closer one is left off. Two species in
 * one place share a point, so they never both get a pin.
 * A new animal group is preferred. Ordered west to east, so "Next species" turns the globe one way round.
 */
function globePicks(pool: Card[], used: Set<string>, pins: Pin[]): GlobeEntry[] {
  const pinOf = new Map(pins.map((p) => [p.slug, p]));
  const picked: GlobeEntry[] = [];
  const groups = new Set<string>();
  const passes = [{ newGroup: true, apart: 20 }, { newGroup: false, apart: 20 }, { newGroup: false, apart: 10 }];
  for (const { newGroup, apart } of passes) {
    for (const c of pool) {
      const pin = pinOf.get(c.slug);
      if (picked.length >= GLOBE_SIZE || !pin || !c.image || used.has(c.slug)) continue;
      if (newGroup && groups.has(c.displayGroup)) continue;
      if (picked.some((e) => arcDegrees(e.pin, pin) < apart)) continue;
      picked.push({ card: { ...c, image: c.image }, pin });
      used.add(c.slug);
      groups.add(c.displayGroup);
    }
  }
  return picked.sort((a, b) => a.pin.lng - b.pin.lng);
}

/** Species cards after the three rules in "How we source facts" (SourceCards, D-068). */
const SOURCE_SPECIES = 4;

/**
 * The source section's species cards, taken last so no other section changes its picks: threatened species whose photo
 * is not already on the page and that have a common name (the card's title is plain text, and a scientific name must
 * be set in italic). Each prefers an animal group the section does not show yet, then takes any.
 */
function sourceSpeciesPicks(pool: Card[], used: Set<string>, shown: (Card | null)[]): Card[] {
  const picked: Card[] = [];
  const groups = new Set(shown.filter((c): c is Card => c !== null).map((c) => c.displayGroup));
  for (const newGroup of [true, false]) {
    for (const c of pool) {
      if (picked.length >= SOURCE_SPECIES || !c.image || !c.commonName || used.has(c.slug)) continue;
      if (newGroup && groups.has(c.displayGroup)) continue;
      picked.push(c);
      used.add(c.slug);
      groups.add(c.displayGroup);
    }
  }
  return picked;
}

/**
 * Hands out photos for the page's photo sections: the next threatened species with a photo that is not already on the
 * page, preferring one that matches `want` and is not already a group tile's photo. So no photo appears twice when
 * there are enough, and a section without a photo left is skipped.
 */
function photoPicker(pool: Card[], used: Set<string>, onTiles: Set<string>) {
  return (want: (c: Card) => boolean = () => true): Card | null => {
    const free = pool.filter((c) => c.image && !used.has(c.slug));
    const fresh = free.filter((c) => !onTiles.has(c.slug));
    const pick = fresh.find(want) ?? fresh[0] ?? free.find(want) ?? free[0] ?? null;
    if (pick) used.add(pick.slug);
    return pick;
  };
}

export default async function Home() {
  // Render per request (never prerendered at build, when the API may be down). Data stays cached by tag.
  await connection();
  const [filters, threatened] = await Promise.all([
    apiGet('/api/v1/filters', { tags: ['catalogue'] }).catch(() => null),
    apiGet('/api/v1/species', { query: { category: 'CR,EN,VU', sort: 'status', pageSize: '48' }, tags: ['catalogue'] }).catch(() => null),
  ]);
  const pool = threatened?.items ?? [];
  const groups = filters?.groups.filter((g) => g.count > 0) ?? [];
  const environments = filters?.environments.filter((e) => e.count > 0) ?? [];
  const regions = (filters?.regions ?? []).filter((r) => r.count > 0);
  const places = [...regions].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name)).slice(0, 10);

  const onTiles = new Set(groups.map((g) => g.example?.slug).filter((s): s is string => Boolean(s)));
  const used = new Set<string>();
  const pick = photoPicker(pool, used, onTiles);
  // Three threatened species for the cards, photos first, then the rest in status order.
  const cards: Card[] = [];
  for (let i = 0; i < 3; i++) {
    const c = pick();
    if (c) cards.push(c);
  }
  for (const c of pool) if (cards.length < 3 && !used.has(c.slug)) cards.push(c);
  const helpPhoto = pick((c) => c.displayGroup === 'mammal');
  const placesPhoto = pick((c) => c.environments.includes('marine'));
  const sourcePhoto = pick((c) => c.displayGroup === 'bird');
  const comparePhoto = pick();
  const strip = stripPicks(pool, used, onTiles);
  // The globe's candidates are the threatened species with a photo not yet on the page; the API says where each lives.
  const globeCandidates = pool.filter((c) => c.image && !used.has(c.slug)).map((c) => c.slug);
  const pins = globeCandidates.length
    ? await apiGet('/api/v1/map/pins', { query: { species: globeCandidates.join(',') }, tags: ['catalogue'] }).catch(() => null)
    : null;
  const globe = globePicks(pool, used, pins?.pins ?? []);
  // The other two source cards take their photos last, so no section above changes its picks (D-068); each prefers an
  // animal group the cards do not show yet.
  const sourcePhotos = [sourcePhoto];
  for (let i = 1; i < 3; i++) sourcePhotos.push(pick((c) => !sourcePhotos.some((p) => p?.displayGroup === c.displayGroup)));
  const sourceSpecies = sourceSpeciesPicks(pool, used, sourcePhotos);

  // schema.org WebSite with the site search, so search engines can offer a search box for the catalogue.
  const site = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SITE_NAME,
    url: absolute('/'),
    potentialAction: { '@type': 'SearchAction', target: { '@type': 'EntryPoint', urlTemplate: absolute('/species?q={search_term_string}') }, 'query-input': 'required name=search_term_string' },
  };

  const stats = filters
    ? [
        { label: 'Species in this catalogue', value: filters.total, Icon: GuideIcon },
        { label: 'Threatened (CR, EN or VU)', value: filters.threatened, Icon: AlertIcon },
        { label: 'Countries, seas and oceans', value: regions.length, Icon: GlobeIcon },
        { label: 'Animal groups', value: groups.length, Icon: BranchIcon },
      ]
    : [];

  return (
    <div className="flush-bottom">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(site) }} />

      {/* ---------- hero: the collage runs under the transparent nav and ends in a curve; the promise and the search sit in its lower part ---------- */}
      <section
        aria-labelledby="hero-h"
        className="relative isolate -mt-[var(--nav-h)] flex min-h-[max(40rem,92svh)] flex-col overflow-hidden bg-black [--curve-h:clamp(3.5rem,10vw,9.5rem)]"
      >
        <figure className="absolute inset-0 m-0">
          {/* Sharp edge to edge, no blur. A fixed file, not catalogue media, so the media loader does not apply (unoptimized).
              On phones the crop centres on the spotted cat, so no seam between two strips runs down the middle. */}
          <Image
            src={HERO_IMAGE.src}
            alt={HERO_IMAGE.alt}
            fill
            priority
            unoptimized
            sizes="100vw"
            className="hero-in object-cover object-[42%_50%] sm:object-center"
          />
          {/* Scrims keep the nav and the headline readable over the faces. */}
          <div aria-hidden className="absolute inset-0 bg-black/25" />
          <div aria-hidden className="absolute inset-0 bg-[linear-gradient(to_bottom,rgb(0_0_0/0.6),transparent_28%,transparent_60%,rgb(0_0_0/0.7))]" />
          <div aria-hidden className="absolute inset-0 bg-[radial-gradient(ellipse_50%_40%_at_50%_67%,rgb(0_0_0/0.45),transparent)]" />
        </figure>

        {/* Anchored to the bottom, a fixed gap above the curve, so the promise and the search sit low. */}
        <div className="relative z-10 flex flex-1 flex-col items-center justify-end px-5 pt-[calc(var(--nav-h)+2rem)] pb-[calc(var(--curve-h)+2.75rem)] text-center sm:pb-[calc(var(--curve-h)+3rem)] lg:pb-[calc(var(--curve-h)-2rem)]">
          {/* The three things the site does, one per line from md up, each verb in lime (D-054). The spans keep the
              spaces in the accessible name ("…a species, see where…"). */}
          <h1 id="hero-h" className="h-hero rise max-w-[17ch] text-balance [text-shadow:0_2px_28px_rgb(0_0_0/0.55)] md:max-w-none">
            <span className="md:block"><strong>Understand</strong> a species,</span>{' '}
            <span className="md:block"><strong>see</strong> where it lives,</span>{' '}
            <span className="md:block">and find a credible way to <strong>help</strong>.</span>
          </h1>
          <form action="/species" method="get" role="search" className="rise rise-2 mt-10 w-full max-w-[58rem]">
            <div className="searchbox h-14 sm:h-16">
              <label htmlFor="home-q" className="sr-only">Search species by name</label>
              <input id="home-q" name="q" type="search" placeholder="Common or scientific name" />
              <button type="submit">
                <span className="sr-only">Search</span>
                <SearchIcon />
              </button>
            </div>
          </form>
          <Link href="/species" className="rise rise-3 btn btn-primary mt-8">
            Explore all species
            <GridIcon />
          </Link>
        </div>

        <HeroCurve id="hero-curve" fill={filters ? 'var(--color-panel)' : 'var(--color-canvas)'} className="absolute inset-x-0 bottom-0 z-10 h-[var(--curve-h)] w-full" />
      </section>

      {/* ---------- the catalogue in numbers ---------- */}
      {filters ? (
        <section aria-labelledby="numbers-h" className="bg-panel">
          <div className="wrap pt-12 pb-20 lg:pt-14 lg:pb-24">
            <h2 id="numbers-h" className="sr-only">This catalogue in numbers</h2>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-14 lg:grid-cols-4">
              {stats.map((s) => (
                <div key={s.label} className="flex flex-col-reverse items-center justify-end text-center">
                  <dt className="mt-3 max-w-[22ch] text-balance text-[0.9375rem] font-semibold leading-snug text-fog sm:text-base">{s.label}</dt>
                  <dd className="flex flex-col items-center">
                    <s.Icon className="h-14 w-14 text-lime sm:h-16 sm:w-16" />
                    <span className="figures mt-5 text-[clamp(2.5rem,4.6vw,3.5rem)] font-bold leading-none tracking-[-0.03em] text-white">{s.value}</span>
                  </dd>
                </div>
              ))}
            </dl>
            <p className="mt-14 text-center text-sm text-muted">These count what this catalogue covers. They are not totals for the world.</p>
          </div>
        </section>
      ) : null}

      {filters === null ? (
        <div className="wrap pt-16">
          <p role="alert" className="notice-error">The catalogue could not be loaded right now. Search still works.</p>
        </div>
      ) : null}

      {/* ---------- meet the animals: a full-screen photo strip of threatened species (D-067) ---------- */}
      <SpeciesStrip cards={strip} allHref={THREATENED_HREF} />

      {/* ---------- around the world: a full-screen globe of threatened species, one place each (D-064) ---------- */}
      <SpeciesGlobe entries={globe} />

      {/* ---------- how we source facts: the three rules as pinned photo cards (D-068) ---------- */}
      <SourceCards photos={sourcePhotos} species={sourceSpecies} />

      {/* ---------- threatened species, as article cards ---------- */}
      {cards.length ? (
        <section aria-labelledby="threatened" className="wrap pb-24 lg:pb-32">
          <SectionHead id="threatened" title="Threatened species in this catalogue" aside={<Link href={THREATENED_HREF} className="more">See all threatened</Link>} />
          <ul className="mt-10 grid gap-x-6 gap-y-14 sm:grid-cols-2 lg:grid-cols-3">
            {cards.map((c, i) => (
              <li key={c.slug} className={i === 2 ? 'sm:max-lg:hidden' : ''}>
                <SpeciesCard card={c} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {/* ---------- browse by animal group: photo tiles ---------- */}
      {groups.length ? (
        <section aria-labelledby="by-group" className="bg-panel">
          <div className="wrap py-24 lg:py-32">
            <SectionHead id="by-group" title="Browse by animal group" aside={<Link href="/species" className="more">All species</Link>} />
            <p className="mt-4 max-w-[60ch] text-muted">Counts are species in this catalogue. Each photo shows one member of the group.</p>
            <ul className="mt-10 grid grid-cols-2 gap-x-3 gap-y-8 sm:gap-x-5 lg:grid-cols-3 lg:gap-x-6 lg:gap-y-10">
              {groups.map((g) => (
                <li key={g.value}>
                  <GroupTile group={g} />
                </li>
              ))}
            </ul>
          </div>
        </section>
      ) : null}

      {/* ---------- compare: a full-bleed photo banner ---------- */}
      <section aria-labelledby="compare-h" className="relative isolate flex min-h-[32rem] items-end overflow-hidden bg-black lg:min-h-[38rem]">
        {comparePhoto?.image ? (
          <figure className="absolute inset-0 m-0 overflow-hidden">
            {/* The whole animal on the right (top on phones); the text sits over the blurred fill. */}
            <WholePhoto storageKey={comparePhoto.image.storageKey} alt={comparePhoto.image.altText} sizes="100vw" position="object-top lg:object-right" />
            <div aria-hidden className="absolute inset-0 bg-[linear-gradient(to_right,rgb(0_0_0/0.82),rgb(0_0_0/0.45)_50%,rgb(0_0_0/0.08))]" />
            <div aria-hidden className="absolute inset-0 bg-[linear-gradient(to_top,rgb(0_0_0/0.65),transparent_50%)]" />
            <figcaption className="absolute inset-x-0 bottom-0 z-20">
              <div className="wrap flex justify-end pb-5">
                <p className="max-w-[52ch] text-right text-xs leading-relaxed text-fog">
                  <Link href={`/species/${comparePhoto.slug}`} className="font-semibold text-white underline decoration-white/50 underline-offset-4 hover:text-lime hover:decoration-lime">
                    {comparePhoto.commonName ?? <i>{comparePhoto.scientificName}</i>}
                  </Link>
                </p>
              </div>
            </figcaption>
          </figure>
        ) : (
          <div aria-hidden className="grid-bg absolute inset-0" />
        )}
        <div className="wrap relative z-10 pt-24 pb-24 lg:pb-28">
          <h2 id="compare-h" className="type-display max-w-[18ch] text-[clamp(2rem,4.2vw,3.5rem)] text-white">Compare up to three species, side by side</h2>
          <p className="mt-5 max-w-[56ch] text-lg leading-relaxed text-fog sm:text-xl sm:leading-relaxed">
            Status, population, habitats, diet and threats in one table. There is no overall score, and figures in different units are never combined.
          </p>
          <Link href="/compare" className="btn btn-primary go mt-8">Start comparing</Link>
        </div>
      </section>

      {/* ---------- where they live: text left, photo right ---------- */}
      {environments.length || places.length ? (
        <section aria-labelledby="places-h" className="wrap grid gap-x-16 gap-y-12 py-24 lg:grid-cols-2 lg:py-32 xl:gap-x-24">
          <div>
            <h2 id="places-h" className="h-section">Where they live</h2>
            <p className="mt-6 max-w-[52ch] text-lg leading-relaxed text-muted">
              Browse by environment or by place. Group and environment are separate: a whale is a mammal and marine.
            </p>
            {environments.length ? (
              <>
                <h3 className="mt-12 text-lg font-bold text-white">By environment</h3>
                <ul className="mt-4 border-t border-rule">
                  {environments.map((e) => (
                    <li key={e.value} className="border-b border-rule">
                      <Link href={`/species?environment=${e.value}`} className="group flex min-h-16 items-center justify-between gap-6 py-3">
                        <span className="text-[1.375rem] font-semibold tracking-[-0.01em] text-white group-hover:text-lime">{ENVIRONMENT_LABEL[e.value] ?? e.value}</span>
                        <span className="figures flex items-center gap-4 text-[0.9375rem] text-muted group-hover:text-lime">
                          {e.count} species
                          <Chevron />
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </>
            ) : null}
            {places.length ? (
              <>
                <h3 className="mt-12 text-lg font-bold text-white">By country, sea or ocean</h3>
                <ul className="mt-4 flex flex-wrap gap-2.5">
                  {places.map((r) => (
                    <li key={r.slug}>
                      <Link href={`/regions/${r.slug}`} className="inline-flex min-h-11 items-center gap-2 border border-rule px-4 text-[0.9375rem] font-medium text-white hover:border-lime hover:text-lime">
                        {r.name} <span className="figures text-muted">({r.count})</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </>
            ) : null}
            <Link href="/map" className="btn btn-soft go mt-10">Open the map</Link>
          </div>
          {placesPhoto ? <SectionPhoto card={placesPhoto} sizes="(min-width: 1024px) 46vw, 100vw" frame="aspect-[4/3]" className="lg:sticky lg:top-[calc(var(--nav-h)+2rem)] lg:self-start" /> : null}
        </section>
      ) : null}

      {/* ---------- how to help: a lime panel whose photo has a curved edge ---------- */}
      <section aria-labelledby="help-h" className="wrap pb-24 lg:pb-32">
        <div className="on-lime relative isolate grid overflow-hidden bg-lime text-black lg:grid-cols-[minmax(0,1fr)_minmax(0,28rem)]">
          <div className="relative z-10 px-6 py-12 sm:px-10 sm:py-14 lg:px-16 lg:py-20">
            <h2 id="help-h" className="type-display text-[clamp(1.875rem,3.2vw,2.75rem)]">Find a credible way to help</h2>
            <p className="mt-5 max-w-[46ch] text-lg font-medium leading-relaxed">
              Our support directory lists reviewed links to independent conservation organizations. Each link shows where it goes before you click,
              and a click is a referral, not a donation.
            </p>
            <Link href="/support" className="btn btn-dark go mt-8">See the support directory</Link>
          </div>
          {helpPhoto?.image ? (
            <div className="relative h-80 sm:h-96 lg:h-auto">
              {/* The photo fills the curved shape with no blurred fill (D-042), so it is cropped a little, anchored above the middle where heads usually are. */}
              <div className="absolute inset-0 [clip-path:ellipse(85%_100%_at_50%_100%)] lg:[clip-path:ellipse(100%_85%_at_100%_50%)]">
                <Image
                  src={mediaSrc(helpPhoto.image.storageKey)}
                  alt={helpPhoto.image.altText}
                  fill
                  sizes="(min-width: 1024px) 28rem, 100vw"
                  className="object-cover object-[50%_30%]"
                />
              </div>
              {/* A thin black arc beside the photo's curved edge. Decorative. */}
              <svg aria-hidden focusable="false" className="pointer-events-none absolute inset-0 h-full w-full overflow-visible" fill="none">
                <ellipse className="lg:hidden" cx="50%" cy="100%" rx="89%" ry="106%" stroke="black" strokeOpacity="0.45" strokeWidth="1.5" />
                <ellipse className="hidden lg:block" cx="100%" cy="50%" rx="105%" ry="89%" stroke="black" strokeOpacity="0.45" strokeWidth="1.5" />
              </svg>
            </div>
          ) : null}
        </div>
        {helpPhoto?.image ? (
          <p className="mt-3 text-right text-xs leading-relaxed text-muted">
            <Link href={`/species/${helpPhoto.slug}`} className="font-semibold text-fog underline decoration-muted underline-offset-4 hover:text-lime hover:decoration-lime">
              {helpPhoto.commonName ?? <i>{helpPhoto.scientificName}</i>}
            </Link>
          </p>
        ) : null}
      </section>
    </div>
  );
}

/** A section's photograph, with the species it shows underneath (the credit is on /credits, D-055). */
function SectionPhoto({ card, sizes, frame, className = '' }: { card: Card; sizes: string; frame: string; className?: string }) {
  if (!card.image) return null;
  return (
    <figure className={`m-0 ${className}`}>
      <div className={`relative overflow-hidden bg-panel ${frame}`}>
        <WholePhoto storageKey={card.image.storageKey} alt={card.image.altText} sizes={sizes} />
      </div>
      <figcaption className="mt-3 text-[0.8125rem] leading-relaxed text-muted">
        <Link href={`/species/${card.slug}`} className="font-semibold text-fog underline decoration-muted underline-offset-4 hover:text-lime hover:decoration-lime">
          {card.commonName ?? <i>{card.scientificName}</i>}
        </Link>
      </figcaption>
    </figure>
  );
}
