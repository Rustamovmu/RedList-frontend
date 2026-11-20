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
 * A species in a list (Explore, home, related). Without an approved photo the slot shows the neutral no-photo state.
 * `eager` is for cards in the first visible row, whose photo is usually the Largest Contentful Paint.
 */
export function SpeciesCard({ card, headingLevel = 'h3', eager = false }: { card: Card; headingLevel?: 'h2' | 'h3'; eager?: boolean }) {
  const H = headingLevel;
  return (
    <article className="relative flex h-full flex-col overflow-hidden rounded-lg border border-line bg-white/70 focus-within:ring-2 focus-within:ring-moss">
      {card.image ? (
        <div className="relative aspect-[4/3] bg-paper-deep">
          <Image src={mediaSrc(card.image.storageKey)} alt={card.image.altText} fill sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw" loading={eager ? 'eager' : 'lazy'} className="object-cover" />
        </div>
      ) : (
        <div className="flex aspect-[4/3] items-center justify-center bg-paper-deep text-xs text-ink-muted" aria-hidden>
          No photo yet
        </div>
      )}
      <div className="flex flex-1 flex-col gap-1 p-3">
        <p className="text-xs font-medium uppercase tracking-wide text-forest-light">{GROUP_LABEL[card.displayGroup]}</p>
        <H className="font-serif text-lg font-semibold leading-snug">
          <Link href={`/species/${card.slug}`} className="after:absolute after:inset-0 hover:underline focus:outline-none">
            {card.commonName ?? <i>{card.scientificName}</i>}
          </Link>
        </H>
        {card.commonName ? <p className="text-sm italic text-ink-muted">{card.scientificName}</p> : null}
        <div className="mt-1">
          {card.status ? (
            <StatusBadge category={card.status.category} year={card.status.assessedOn ? Number(card.status.assessedOn.slice(0, 4)) : undefined} scope={card.status.scope} size="sm" />
          ) : (
            <span className="text-sm text-ink-muted">{card.notAssessed ? 'Not assessed' : 'Status unknown'}</span>
          )}
        </div>
        <p className="mt-auto pt-2 text-sm text-ink-muted">{contextLine(card)}</p>
        {/* Attribution travels with the image wherever it is shown (CC BY / BY-SA). Above the link overlay so it stays readable. */}
        {card.image ? <p className="relative pt-1 text-[11px] leading-snug text-ink-muted">{card.image.credit}</p> : null}
      </div>
    </article>
  );
}
