import Image from 'next/image';
import Link from 'next/link';
import { StatusBadge } from '@/components/StatusBadge';
import type { components } from '@/contracts/api';
import { ENVIRONMENT_LABEL, GROUP_LABEL } from '@/lib/labels';
import { mediaSrc } from '@/lib/media';

type Card = components['schemas']['SpeciesCardDto'];

/** One context line: where it lives, in words, without revealing withheld locations. */
function contextLine(c: Card): string {
  const env = c.environments.map((e) => ENVIRONMENT_LABEL[e]).join(', ') || 'Environment unknown';
  if (c.locationWithheld) return `${env} · locations withheld`;
  if (c.regionCount === null || c.regionCount === 0) return env;
  return `${env} · ${c.regionCount} ${c.regionCount === 1 ? 'country or sea' : 'countries and seas'}`;
}

/**
 * A species in a list (Explore, home, related, map, regions). Without an approved photo the slot shows the
 * neutral no-photo state. `eager` is for cards in the first visible row, whose photo is usually the Largest
 * Contentful Paint. `feature` is the large home-page variant, with the name in the display face.
 */
export function SpeciesCard({
  card, headingLevel = 'h3', eager = false, feature = false,
}: { card: Card; headingLevel?: 'h2' | 'h3'; eager?: boolean; feature?: boolean }) {
  const H = headingLevel;
  const bigName = feature && card.commonName;
  return (
    <article className="group relative flex h-full flex-col border border-rule bg-panel outline-offset-2 outline-lime hover:outline hover:outline-1 focus-within:outline focus-within:outline-[3px]">
      {card.image ? (
        <div className={`relative overflow-hidden bg-raised ${feature ? 'aspect-[4/3] lg:aspect-auto lg:min-h-72 lg:flex-1' : 'aspect-[4/3]'}`}>
          <Image
            src={mediaSrc(card.image.storageKey)}
            alt={card.image.altText}
            fill
            sizes={feature ? '(min-width: 1024px) 50vw, 100vw' : '(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw'}
            loading={eager ? 'eager' : 'lazy'}
            className="object-cover"
          />
        </div>
      ) : (
        <div className={`grid-bg flex items-center justify-center font-mono text-xs uppercase tracking-[0.14em] text-muted ${feature ? 'aspect-[4/3] lg:aspect-auto lg:min-h-72 lg:flex-1' : 'aspect-[4/3]'}`} aria-hidden>
          No photo yet
        </div>
      )}
      <div className={`flex flex-col gap-1.5 ${feature ? 'p-5 lg:p-6' : 'flex-1 p-4'}`}>
        <p className="kicker">{GROUP_LABEL[card.displayGroup]}</p>
        <H className={bigName ? 'type-display text-[clamp(2.25rem,4vw,3.25rem)] leading-[0.95] text-white' : 'font-mono text-lg font-bold leading-snug text-white'}>
          <Link href={`/species/${card.slug}`} className="after:absolute after:inset-0 focus:outline-none group-hover:text-lime">
            {card.commonName ?? <i>{card.scientificName}</i>}
          </Link>
        </H>
        {card.commonName ? <p className="text-[0.9375rem] italic text-muted">{card.scientificName}</p> : null}
        <div className="mt-1.5">
          {card.status ? (
            <StatusBadge category={card.status.category} year={card.status.assessedOn ? Number(card.status.assessedOn.slice(0, 4)) : undefined} scope={card.status.scope} size="sm" />
          ) : (
            <span className="font-mono text-xs text-muted">{card.notAssessed ? 'Not assessed' : 'Status unknown'}</span>
          )}
        </div>
        <p className="mt-auto pt-3 font-mono text-xs leading-relaxed text-muted">{contextLine(card)}</p>
        {/* Attribution travels with the image wherever it is shown (CC BY / BY-SA). Above the link overlay so it stays readable. */}
        {card.image ? <p className="relative text-[0.6875rem] leading-snug text-muted">{card.image.credit}</p> : null}
      </div>
    </article>
  );
}
