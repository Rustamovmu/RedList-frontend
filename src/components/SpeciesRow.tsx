import Link from 'next/link';
import { StatusBadge } from '@/components/StatusBadge';
import { WholePhoto } from '@/components/WholePhoto';
import type { components } from '@/contracts/api';

type Card = components['schemas']['SpeciesCardDto'];

/**
 * A species as one compact row, for long lists beside or under a map (D-059): a small photo (whole, never cropped:
 * WholePhoto, D-039), the status badge, the names and an optional note. Same content rules as SpeciesCard, at a
 * fraction of its height. The whole row is the link (the name's ::after covers it).
 */
export function SpeciesRow({ card, note }: { card: Card; note?: string }) {
  return (
    <article className="group relative grid grid-cols-[6.5rem_minmax(0,1fr)] gap-x-4 outline-offset-4 outline-lime focus-within:outline focus-within:outline-[3px] sm:grid-cols-[7.5rem_minmax(0,1fr)]">
      {card.image ? (
        <div className="relative aspect-[3/2] self-start overflow-hidden bg-panel">
          <WholePhoto
            storageKey={card.image.storageKey}
            alt={card.image.altText}
            sizes="7.5rem"
            className="transition-transform duration-500 ease-out group-hover:scale-[1.04]"
          />
        </div>
      ) : (
        <div className="grid-bg flex aspect-[3/2] items-center justify-center self-start text-[0.625rem] font-semibold uppercase tracking-[0.12em] text-muted" aria-hidden>
          No photo
        </div>
      )}
      <div className="min-w-0">
        {card.status ? (
          <StatusBadge category={card.status.category} year={card.status.assessedOn ? Number(card.status.assessedOn.slice(0, 4)) : undefined} scope={card.status.scope} size="sm" />
        ) : (
          <span className="tag px-2 py-0.5 text-xs">{card.notAssessed ? 'Not assessed' : 'Status unknown'}</span>
        )}
        <h3 className="mt-1.5 text-[1.0625rem] font-bold leading-snug tracking-[-0.01em] text-white">
          <Link href={`/species/${card.slug}`} className="decoration-lime decoration-2 underline-offset-4 after:absolute after:inset-0 focus:outline-none group-hover:underline">
            {card.commonName ?? <i>{card.scientificName}</i>}
          </Link>
        </h3>
        {card.commonName ? <p className="text-sm italic text-fog">{card.scientificName}</p> : null}
        {note ? <p className="mt-1 text-[0.8125rem] leading-snug text-muted">{note}</p> : null}
      </div>
    </article>
  );
}
