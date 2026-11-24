'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { type PictureFrameStyle, PictureRailGallery, type PictureRailItem } from '@/components/ui/picture-rail-gallery';
import type { components } from '@/contracts/api';
import { IUCN_LABEL } from '@/lib/iucn';
import { ENVIRONMENT_LABEL, GROUP_LABEL } from '@/lib/labels';
import { mediaSrc } from '@/lib/media';

type Card = components['schemas']['SpeciesCardDto'];

/** Frame styles and wire lengths, cycled so neighbouring frames differ. Decoration only: they carry no meaning. */
const FRAMES: PictureFrameStyle[] = ['black', 'oak', 'white'];
const DROPS = [0.04, 0.18, 0, 0.12, 0.24, 0.06, 0.15];
/** One generated WebP width for the rail and the lifted view (frames are at most ~200 CSS px, the lifted view ~520). */
const PHOTO_WIDTH = 960;

/** The back label and the lifted view's chips: what the card already says, in words. Withheld locations stay withheld. */
function details(c: Card): string[] {
  const lines = [GROUP_LABEL[c.displayGroup]];
  if (c.environments.length) lines.push(c.environments.map((e) => ENVIRONMENT_LABEL[e] ?? e).join(', '));
  if (c.status) {
    const year = c.status.assessedOn?.slice(0, 4);
    lines.push(`${c.status.scope === 'global' ? 'Global' : 'Regional'} assessment${year ? `, ${year}` : ''}`);
  }
  if (c.locationWithheld) lines.push('Locations withheld');
  else if (c.regionCount) lines.push(`${c.regionCount} ${c.regionCount === 1 ? 'country or sea' : 'countries and seas'}`);
  return lines;
}

function toItem(c: Card & { image: NonNullable<Card['image']> }, i: number): PictureRailItem {
  return {
    id: c.slug,
    title: c.commonName ?? c.scientificName,
    artist: c.commonName ? c.scientificName : undefined,
    image: `${mediaSrc(c.image.storageKey)}/${PHOTO_WIDTH}.webp`,
    // The frame takes the photo's own shape, so the photo is never cropped (D-039). The page only passes photos
    // the rail can frame (fitsWall in app/page.tsx).
    aspect: c.image.width / c.image.height,
    frame: FRAMES[i % FRAMES.length],
    mat: i % 2 === 1,
    drop: DROPS[i % DROPS.length],
    tag: c.status ? IUCN_LABEL[c.status.category] : undefined,
    details: details(c),
  };
}

/** How far below the screen the wall starts to hang its frames and load its photos. */
const NEAR = '600px 0px';

/**
 * The home page's photo wall (DECISIONS D-063): a full-screen section in which threatened species from this catalogue
 * hang as framed photos on a picture rail. Pointing at a frame, tapping it or tabbing to it lights it and names the
 * species; selecting it again lifts it, and its back carries a label with the group, environment, assessment and
 * places. A link under the rail leads to the profile of the last species lit.
 *
 * Every photo is a catalogue photo served by our own API, shown whole. Credits are on /credits and each profile (D-055).
 * The rail is drawn in the browser only: it measures its own width and places the frames with script. The server
 * renders the heading, the link and a space of about the rail's height. The rail is hung when the section comes within
 * 600 px of the screen (at once on most desktop screens, where the section starts just below the first screen), and then
 * loads all its photos together, so a swipe through the phone carousel never lands on a photo that is still loading.
 */
export function SpeciesWall({ cards, allHref }: { cards: Card[]; allHref: string }) {
  // Memoized: a new items array would make the rail recompute its layout every time the lit species changes.
  const hung = useMemo(() => cards.filter((c): c is Card & { image: NonNullable<Card['image']> } => c.image !== null), [cards]);
  const items = useMemo(() => hung.map(toItem), [hung]);
  const sectionRef = useRef<HTMLElement>(null);
  const [live, setLive] = useState(false);
  useEffect(() => {
    const node = sectionRef.current;
    if (!node || live) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) setLive(true);
    }, { rootMargin: NEAR });
    observer.observe(node);
    return () => observer.disconnect();
  }, [live]);
  // The rail unlights every frame when the pointer leaves it, so the link keeps the LAST species lit: moving the mouse
  // from a frame down to the link must not change the link under it.
  const [last, setLast] = useState<number | null>(null);
  const lastCard = last === null ? null : (hung[last] ?? null);

  if (!items.length) return null;
  return (
    <section
      ref={sectionRef}
      aria-labelledby="wall-h"
      className="relative isolate flex min-h-[calc(100svh-var(--nav-h))] flex-col justify-center overflow-hidden py-16 lg:py-20"
    >
      <div className="wrap text-center">
        <h2 id="wall-h" className="h-section">Meet the animals</h2>
        <p className="mx-auto mt-5 max-w-[58ch] text-lg leading-relaxed text-muted">
          Photographs of threatened species in this catalogue. Light a frame to see which species it is, then lift it to read its label.
        </p>
      </div>

      {live ? (
        <PictureRailGallery
          aria-label="Photo wall"
          items={items}
          caption="Point at a frame, tap it or tab to it."
          labels={{ front: 'Photo', back: 'Label', close: 'Close', open: 'select it again to lift it' }}
          onActiveChange={(i) => {
            if (i !== null) setLast(i);
          }}
          // Inside the rail, `muted` is the backing behind a photo while it loads: raised navy, not the text grey.
          className="mx-auto mt-8 max-w-[120rem] [--color-muted:var(--color-raised)]"
          action={
            <div className="mt-2 flex flex-wrap justify-center gap-3">
              {lastCard ? (
                <Link href={`/species/${lastCard.slug}`} className="btn btn-primary go">
                  {lastCard.commonName ?? <i>{lastCard.scientificName}</i>} profile
                </Link>
              ) : null}
              <Link href={allHref} className="btn btn-soft go">See all threatened species</Link>
            </div>
          }
        />
      ) : (
        // Holds the rail's place until it is drawn, so the page does not jump.
        <div aria-hidden className="mt-8 h-[25rem] sm:h-[27rem]" />
      )}
    </section>
  );
}
