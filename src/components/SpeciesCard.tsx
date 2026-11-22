import Link from 'next/link';
import { StatusBadge } from '@/components/StatusBadge';
import { WholePhoto } from '@/components/WholePhoto';
import type { components } from '@/contracts/api';
import { ENVIRONMENT_LABEL, GROUP_LABEL } from '@/lib/labels';

type Card = components['schemas']['SpeciesCardDto'];

/** One context line: the group and where it lives, in words, without revealing withheld locations. */
function contextLine(c: Card): string {
  const env = c.environments.map((e) => ENVIRONMENT_LABEL[e]).join(', ') || 'Environment unknown';
  const head = `${GROUP_LABEL[c.displayGroup]} · ${env}`;
  if (c.locationWithheld) return `${head} · locations withheld`;
  if (c.regionCount === null || c.regionCount === 0) return head;
  return `${head} · ${c.regionCount} ${c.regionCount === 1 ? 'country or sea' : 'countries and seas'}`;
}

/**
 * A species in a list (Explore, home, related, map, regions), laid out like an article card: the photo (whole, never
 * cropped: WholePhoto), the status as the card's tag, the name, then a muted context line. Without an approved photo
 * the slot shows the neutral no-photo state. `eager` is for cards in the first visible row, whose photo is usually the Largest Contentful Paint.
 * The whole card is the link (the name's ::after covers it). The photo's credit is on /credits and the profile (D-055).
 */
export function SpeciesCard({
  card, headingLevel = 'h3', eager = false,
}: { card: Card; headingLevel?: 'h2' | 'h3'; eager?: boolean }) {
  const H = headingLevel;
  return (
    <article className="group relative flex h-full flex-col outline-offset-4 outline-lime focus-within:outline focus-within:outline-[3px]">
      {card.image ? (
        <div className="relative aspect-[3/2] overflow-hidden bg-panel">
          <WholePhoto
            storageKey={card.image.storageKey}
            alt={card.image.altText}
            sizes="(min-width: 1280px) 30vw, (min-width: 640px) 50vw, 100vw"
            eager={eager}
            className="transition-transform duration-500 ease-out group-hover:scale-[1.03]"
          />
        </div>
      ) : (
        <div className="grid-bg flex aspect-[3/2] items-center justify-center text-xs font-semibold uppercase tracking-[0.12em] text-muted" aria-hidden>
          No photo yet
        </div>
      )}
      <div className="flex flex-1 flex-col pt-4">
        <div>
          {card.status ? (
            <StatusBadge category={card.status.category} year={card.status.assessedOn ? Number(card.status.assessedOn.slice(0, 4)) : undefined} scope={card.status.scope} size="sm" />
          ) : (
            <span className="tag">{card.notAssessed ? 'Not assessed' : 'Status unknown'}</span>
          )}
        </div>
        <H className="h-card mt-3">
          <Link href={`/species/${card.slug}`} className="decoration-lime decoration-2 underline-offset-[5px] after:absolute after:inset-0 focus:outline-none group-hover:underline">
            {card.commonName ?? <i>{card.scientificName}</i>}
          </Link>
        </H>
        {card.commonName ? <p className="mt-0.5 text-[0.9375rem] italic text-fog">{card.scientificName}</p> : null}
        <p className="mt-2 text-[0.9375rem] leading-relaxed text-muted">{contextLine(card)}</p>
      </div>
    </article>
  );
}
