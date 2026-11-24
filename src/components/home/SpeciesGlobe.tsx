'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { type GlobeTestimonial, TestimonialGlobe } from '@/components/ui/testimonial-globe';
import type { components } from '@/contracts/api';
import { IUCN_LABEL } from '@/lib/iucn';
import { GROUP_LABEL } from '@/lib/labels';
import { mediaSrc } from '@/lib/media';

type Card = components['schemas']['SpeciesCardDto'];
type Pin = components['schemas']['SpeciesPinDto'];

/** A species on the globe: its card (with a photo) and its pin from GET /map/pins. */
export type GlobeEntry = { card: Card & { image: NonNullable<Card['image']> }; pin: Pin };

/** Pins are at most 44 px and the card's portrait 44 px, both round, so the smallest generated width is plenty. */
const PHOTO_WIDTH = 320;
/** How far below the screen the globe starts its WebGL canvas and loads its photos. */
const NEAR = '600px 0px';

/**
 * The card's text: what the catalogue says, in words. It is shown as plain text, never as a quotation. The place
 * count is the one species cards show.
 */
function factLine({ card, pin }: GlobeEntry): string {
  const s = card.status;
  const status = s
    ? `${IUCN_LABEL[s.category]} (${s.scope === 'global' ? 'global' : 'regional'} assessment${s.assessedOn ? `, ${s.assessedOn.slice(0, 4)}` : ''}).`
    : card.notAssessed
      ? 'Not assessed.'
      : 'Status unknown.';
  const more = (card.regionCount ?? 1) - 1;
  const where = more > 0
    ? `Recorded in ${pin.place.name} and ${more} more ${more === 1 ? 'country or sea' : 'countries and seas'}.`
    : `Recorded in ${pin.place.name}.`;
  return `${status} ${where}`;
}

function toItem(e: GlobeEntry): GlobeTestimonial {
  const { card, pin } = e;
  return {
    id: card.slug,
    quote: factLine(e),
    name: card.commonName ?? card.scientificName,
    role: card.commonName ? card.scientificName : undefined,
    company: GROUP_LABEL[card.displayGroup],
    city: pin.place.name,
    lat: pin.lat,
    lng: pin.lng,
    image: `${mediaSrc(card.image.storageKey)}/${PHOTO_WIDTH}.webp`,
    tone: 2, // every ring lime: colour means nothing on the globe
    href: `/species/${card.slug}`,
  };
}

/**
 * The home page's globe (DECISIONS D-064, an owner-approved exception to PLAN §4 "avoid 3D globes"): a full-screen
 * section in which threatened species from this catalogue are pinned to one country, sea or ocean where each lives.
 * The pin is a point inside that place, never inside a range; the card says "Recorded in <place>". Pointing at a pin,
 * clicking it or moving between pins with the arrow keys turns its card up; the species name on the card links to the
 * profile. Its photo is cropped to a circle in the pin and on the card (an exception to D-039).
 *
 * The globe turns slowly on its own, so a button pauses all its motion (WCAG 2.2.2): rotation, the pins' pulse and the
 * stars. With reduced motion it never turns, and the button is hidden. Like the photo wall, it is drawn in the browser
 * once the section is within 600 px of the screen; the server renders the heading and a space of about its height.
 */
export function SpeciesGlobe({ entries }: { entries: GlobeEntry[] }) {
  const items = useMemo(() => entries.map(toItem), [entries]);
  const sectionRef = useRef<HTMLElement>(null);
  const [live, setLive] = useState(false);
  const [paused, setPaused] = useState(false);
  useEffect(() => {
    const node = sectionRef.current;
    if (!node || live) return;
    const observer = new IntersectionObserver((list) => {
      if (list.some((e) => e.isIntersecting)) setLive(true);
    }, { rootMargin: NEAR });
    observer.observe(node);
    return () => observer.disconnect();
  }, [live]);

  if (!items.length) return null;
  return (
    <section
      ref={sectionRef}
      aria-labelledby="globe-h"
      className="relative isolate flex min-h-[calc(100svh-var(--nav-h))] flex-col justify-center overflow-hidden py-16 lg:py-20"
    >
      <div className="wrap text-center">
        <h2 id="globe-h" className="h-section">Around the world</h2>
        <p className="mx-auto mt-5 max-w-[60ch] text-lg leading-relaxed text-muted">
          Each pin is a threatened species from this catalogue, placed on one country, sea or ocean where it lives. Turn the globe, or pick a pin to read about the species.
        </p>
      </div>

      {live ? (
        <TestimonialGlobe
          aria-label="Globe of threatened species"
          items={items}
          quotes={false}
          counters={false}
          autoRotate={!paused}
          labels={{ previous: 'Previous species', next: 'Next species', pin: 'Show' }}
          // Inside the globe, `muted` is the backing behind a photo while it loads: raised navy, not the text grey.
          // Paused, every CSS animation inside stops too (the pins' pulse, the stars).
          className={`mt-4 [--color-muted:var(--color-raised)] ${paused ? '[&_*]:[animation-play-state:paused]' : ''}`}
          action={
            <div className="flex flex-wrap items-center justify-center gap-3">
              <Link href="/map" className="btn btn-soft go">Open the map</Link>
              <button type="button" className="btn btn-quiet motion-reduce:hidden" onClick={() => setPaused((p) => !p)}>
                {paused ? 'Resume motion' : 'Pause motion'}
              </button>
            </div>
          }
        />
      ) : (
        // Holds the globe's place until it is drawn, so the page does not jump.
        <div aria-hidden className="mt-4 h-[40rem] md:h-[33rem]" />
      )}
    </section>
  );
}
