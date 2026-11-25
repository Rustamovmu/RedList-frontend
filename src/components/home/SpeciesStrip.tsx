'use client';

import Link from 'next/link';
import { type CSSProperties, useEffect, useMemo, useRef, useState } from 'react';
import { StatusBadge } from '@/components/StatusBadge';
import { FilmstripScrub, type FilmstripFrame } from '@/components/ui/filmstrip-scrub';
import { useReducedMotion, useVisibilityPause } from '@/components/ui/filmstrip-scrub-utils/motiq';
import { WholePhoto } from '@/components/WholePhoto';
import type { components } from '@/contracts/api';
import { ENVIRONMENT_LABEL, GROUP_LABEL } from '@/lib/labels';

type Card = components['schemas']['SpeciesCardDto'];
type PhotoCard = Card & { image: NonNullable<Card['image']> };

/** How long each species stays before the strip moves on by itself. */
const STEP_MS = 4000;
/** The preview is at most 60rem wide (see the viewer's width below); thumbnails reuse the same file. */
const SIZES = '(min-width: 1024px) 60rem, 100vw';

/**
 * The filmstrip's own colour names (it reads them with fallbacks), set to the site's palette: navy surfaces, the lime
 * signal colour for the playhead, the current thumbnail's outline and the readout's dot, and white for the name in the
 * readout. `--color-border` is already the rule colour site-wide (globals.css).
 */
const PALETTE = {
  '--color-bg-elevated': 'var(--color-panel)',
  '--color-surface': 'var(--color-panel)',
  '--color-accent': 'var(--color-lime)',
  '--color-success': 'var(--color-lime)',
  '--color-warning': '#ffffff',
} as CSSProperties;

const nameOf = (c: Card) => c.commonName ?? c.scientificName;

/** What the card already says, in words: group, environments, places. Withheld locations stay withheld. */
function details(c: Card): string[] {
  const lines = [GROUP_LABEL[c.displayGroup]];
  if (c.environments.length) lines.push(c.environments.map((e) => ENVIRONMENT_LABEL[e] ?? e).join(', '));
  if (c.locationWithheld) lines.push('Locations withheld');
  else if (c.regionCount) lines.push(`Recorded in ${c.regionCount} ${c.regionCount === 1 ? 'country or sea' : 'countries and seas'}`);
  return lines;
}

/**
 * True while the visitor is pointing at the viewer or has moved keyboard focus into it, so the strip never moves on
 * under them. The pause button does not count: after "Resume motion" the strip should move again.
 */
function engaged(viewer: HTMLElement | null, pause: HTMLElement | null): boolean {
  if (!viewer) return false;
  if (viewer.matches(':hover') && !pause?.matches(':hover')) return true;
  const active = document.activeElement;
  return active instanceof HTMLElement && active !== pause && viewer.contains(active) && active.matches(':focus-visible');
}

/**
 * The home page's photo strip (DECISIONS D-067, replacing the picture rail of D-063): a full-screen section in which
 * threatened species from this catalogue run as a filmstrip under a large preview. Pointing along the strip, dragging
 * it, or tabbing to it and using the arrow keys (Home and End jump to the ends) moves the playhead; the preview
 * cross-fades between neighbouring photos, and the panel beside it names the species, its status and where it lives,
 * with a link to its profile.
 *
 * Every photo is a catalogue photo served by our own API, shown whole with a blurred fill (WholePhoto, D-039), in the
 * preview and in the thumbnails. Credits are on /credits and each profile (D-055).
 *
 * Left alone, the strip steps to the next species every 4 seconds and turns back at each end. It waits while the
 * visitor points at it or has keyboard focus in it, and while it is off screen or the tab is hidden. "Pause motion"
 * stops it (WCAG 2.2.2). With reduced motion it never moves by itself, the playhead jumps, and the button is hidden.
 * The section renders on the server; its photos load lazily as it comes near the screen.
 */
export function SpeciesStrip({ cards, allHref }: { cards: Card[]; allHref: string }) {
  const shown = useMemo(() => cards.filter((c): c is PhotoCard => c.image !== null), [cards]);
  // Memoized: new frame nodes would make every photo re-render each time the current species changes.
  const frames = useMemo<FilmstripFrame[]>(
    () =>
      shown.map((c) => ({
        id: c.slug,
        label: nameOf(c),
        node: (
          // The strip's thumbnails do not clip, and WholePhoto's blurred copy is scaled up, so each photo gets its own
          // clipping box. A native image drag would cancel the scrub, so it is blocked.
          <div className="absolute inset-0 overflow-hidden" onDragStart={(e) => e.preventDefault()}>
            <WholePhoto storageKey={c.image.storageKey} alt={c.image.altText} sizes={SIZES} />
          </div>
        ),
      })),
    [shown],
  );
  const n = frames.length;

  const viewerRef = useRef<HTMLDivElement>(null);
  const pauseRef = useRef<HTMLButtonElement>(null);
  const dir = useRef(1);
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const reduced = useReducedMotion();
  const onScreen = useVisibilityPause(viewerRef, { threshold: 0.25 });

  // Moves on one species at a time, turning back at each end. Any change of species, the visitor's included,
  // restarts the wait.
  useEffect(() => {
    if (paused || reduced || !onScreen || n < 2) return;
    const id = window.setInterval(() => {
      if (engaged(viewerRef.current, pauseRef.current)) return;
      let d = dir.current;
      if (index + d < 0 || index + d > n - 1) d = -d;
      dir.current = d;
      setIndex(index + d);
    }, STEP_MS);
    return () => window.clearInterval(id);
  }, [index, paused, reduced, onScreen, n]);

  if (n < 2) return null;
  const current = shown[Math.min(index, n - 1)];
  const name = nameOf(current);
  return (
    <section
      aria-labelledby="strip-h"
      className="relative isolate flex min-h-[calc(100svh-var(--nav-h))] flex-col justify-center overflow-hidden py-16 lg:py-20"
    >
      <div className="wrap text-center">
        <h2 id="strip-h" className="h-section">Meet the animals</h2>
        <p className="mx-auto mt-5 max-w-[62ch] text-lg leading-relaxed text-muted">
          Photographs of threatened species in this catalogue. Point along the strip, drag it, or tab to it and use the arrow keys.
        </p>
      </div>

      <div
        ref={viewerRef}
        className="wrap mt-10 grid gap-x-12 gap-y-8 lg:grid-cols-[auto_minmax(17rem,21rem)] lg:items-center lg:justify-center"
      >
        {/* On wide screens the preview takes the height left on the screen under the heading, so the whole strip is in
            view once the section is scrolled to (25rem: top padding, heading, gap and the strip). Down to 1280 × 720. */}
        <div className="w-full lg:w-[clamp(28rem,calc((100svh-var(--nav-h)-25rem)*16/9),60rem)]">
          <FilmstripScrub
            frames={frames}
            frameIndex={index}
            onFrameIndexChange={setIndex}
            idleSpeed={0}
            timecode={false}
            settle
            scrubberLabel="Species photos"
            style={PALETTE}
          />
        </div>

        {/* The species shown. Not announced as it changes: the strip's own value already says the name. */}
        <div className="flex flex-col">
          <p className="figures text-sm font-semibold text-muted">
            Photo {index + 1} of {n}
          </p>
          {/* Every species' details share one grid cell and only the current one is visible (hidden ones are also
              hidden from assistive technology), so the panel is as tall as the tallest and nothing under it moves
              when the species changes. */}
          <div className="mt-2 grid">
            {shown.map((c, i) => (
              <div key={c.slug} className={`[grid-area:1/1] ${i === index ? '' : 'invisible'}`}>
                <h3 className="text-balance text-[clamp(1.5rem,2.4vw,2rem)] font-bold leading-tight tracking-[-0.02em] text-white">
                  {c.commonName ?? <i>{c.scientificName}</i>}
                </h3>
                {c.commonName ? <p className="mt-1 italic text-muted">{c.scientificName}</p> : null}
                {c.status ? (
                  <div className="mt-4">
                    <StatusBadge category={c.status.category} year={c.status.assessedOn ? Number(c.status.assessedOn.slice(0, 4)) : undefined} scope={c.status.scope} />
                  </div>
                ) : null}
                <ul className="mt-4 space-y-1 text-[0.9375rem] leading-relaxed text-fog">
                  {details(c).map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-3 pt-7">
            <Link href={`/species/${current.slug}`} className="btn btn-primary go">
              Open profile<span className="sr-only">: {name}</span>
            </Link>
            <button ref={pauseRef} type="button" className="btn btn-quiet motion-reduce:hidden" onClick={() => setPaused((p) => !p)}>
              {paused ? 'Resume motion' : 'Pause motion'}
            </button>
          </div>
          <Link href={allHref} className="more mt-5 self-start">See all threatened species</Link>
        </div>
      </div>
    </section>
  );
}
