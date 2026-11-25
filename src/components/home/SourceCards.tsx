import Link from 'next/link';
import { CardsParallax, type iCardItem } from '@/components/ui/scroll-cards';
import { WholePhoto } from '@/components/WholePhoto';
import type { components } from '@/contracts/api';
import { IUCN_LABEL } from '@/lib/iucn';
import { GROUP_LABEL } from '@/lib/labels';
import { SITE_NAME } from '@/lib/site';

type Card = components['schemas']['SpeciesCardDto'];

/** The three rules, each with a short title for its card. */
const RULES = [
  { title: 'Sourced', text: 'Every number and status links to the source it came from, with the source’s own date.' },
  { title: 'Measured', text: 'Population estimates keep their units, places and years, and unknown is never shown as zero.' },
  { title: 'Reviewed', text: 'Each profile is reviewed by our editors before it is published, and the review date is shown.' },
];

/** The card is at most 68.75 rem (1100 px) wide, and narrower than the screen below that. */
const SIZES = '(min-width: 1152px) 1100px, 100vw';

/**
 * What the catalogue says about a species, in words: its status with the assessment's year and scope, and its
 * animal group. Nothing here is written for the card; a missing date is left out, never guessed.
 */
function speciesLine(c: Card): string {
  const parts: string[] = [];
  if (c.status) {
    const year = c.status.assessedOn?.slice(0, 4);
    const scope = c.status.scope === 'regional' ? ' (regional)' : '';
    parts.push(`${IUCN_LABEL[c.status.category]}${scope}${year ? `, assessed ${year}` : ''}`);
  }
  parts.push(GROUP_LABEL[c.displayGroup]);
  return parts.join(' · ');
}

function photoOf(card: Card | null) {
  const image = card?.image;
  return image ? <WholePhoto storageKey={image.storageKey} alt={image.altText} sizes={SIZES} /> : undefined;
}

function captionOf(card: Card | null) {
  if (!card?.image) return undefined;
  return (
    <Link href={`/species/${card.slug}`} className="font-semibold text-white underline decoration-white/60 underline-offset-4 hover:text-lime hover:decoration-lime">
      {card.commonName ?? <i>{card.scientificName}</i>}
    </Link>
  );
}

/**
 * "How we source facts" on the home page (DECISIONS D-068): the section's three rules, then threatened species from
 * this catalogue, as the scroll cards kit's photo cards. Each card stays pinned below the navigation while the next
 * slides up over it. Each card has a catalogue photo shown whole with a blurred fill (WholePhoto, D-039) under a
 * scrim, with the species named at its foot like every other photo on the page (credits on /credits, D-055). A rule
 * card without a photo keeps the navy panel. A species card shows the name, the status with its year, and the group.
 * Pure scroll, so nothing moves by itself. The section renders on the server, and the photos load lazily.
 */
export function SourceCards({ photos, species }: { photos: (Card | null)[]; species: Card[] }) {
  const base = { color: 'var(--color-panel)', textColor: '#ffffff' };
  const items: iCardItem[] = [
    ...RULES.map((rule, i) => {
      const card = photos[i] ?? null;
      return {
        ...base,
        title: rule.title,
        description: rule.text,
        // `tag` and `link` are required by the kit's type, but the kit neither shows nor uses them.
        tag: card?.displayGroup ?? 'rule',
        link: card ? `/species/${card.slug}` : '/methodology',
        media: photoOf(card),
        caption: captionOf(card),
      };
    }),
    ...species.map((card) => ({
      ...base,
      title: card.commonName ?? card.scientificName,
      description: speciesLine(card),
      tag: card.displayGroup,
      link: `/species/${card.slug}`,
      media: photoOf(card),
      caption: captionOf(card),
    })),
  ];

  return (
    <section aria-labelledby="how" className="pt-24 pb-24 lg:pt-32 lg:pb-32">
      <div className="wrap text-center">
        <h2 id="how" className="h-section">How we source facts</h2>
        <p className="mx-auto mt-6 max-w-[54ch] text-lg leading-relaxed text-muted">
          {SITE_NAME} is an independent catalogue for curious learners. Each profile answers the same eight questions, from what a species is to how we know.
        </p>
      </div>
      <CardsParallax items={items} />
      <div className="wrap flex justify-center">
        <Link href="/methodology" className="btn btn-soft go">Read the methodology</Link>
      </div>
    </section>
  );
}
