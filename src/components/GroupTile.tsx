import Link from 'next/link';
import { WholePhoto } from '@/components/WholePhoto';
import type { components } from '@/contracts/api';
import { GROUP_PLURAL } from '@/lib/labels';

type Group = components['schemas']['GroupFacetDto'];

/**
 * A home-page tile for one animal group: a photo of one of its species (the API picks it: a sharp photo of the group's
 * most widespread species) under a dark scrim, with the group name, its count and "See species" in the lower left.
 * The photo is decoration here, because the link says what the tile is. The caption under the tile names the species
 * shown, so the photo is never read as the whole group. The photo's credit is on /credits (D-055). Without a photo the
 * tile shows the faint grid.
 *
 * The photo sits at z -10 inside an isolated tile, so the link's text paints above it while the link's ::after
 * overlay makes the whole tile clickable.
 */
export function GroupTile({ group }: { group: Group }) {
  const label = GROUP_PLURAL[group.value as keyof typeof GROUP_PLURAL] ?? group.value;
  const ex = group.example;
  return (
    <div className="flex h-full flex-col">
      <div className="group relative isolate flex aspect-[4/5] flex-col justify-end overflow-hidden bg-panel outline-offset-4 outline-lime focus-within:outline focus-within:outline-[3px] sm:aspect-[3/2]">
        {ex ? (
          <div aria-hidden className="absolute inset-0 -z-10 overflow-hidden">
            {/* The whole photo, never cropped, pinned to the top so any spare room falls under the text (D-039). */}
            <WholePhoto
              storageKey={ex.image.storageKey}
              alt=""
              sizes="(min-width: 1440px) 28rem, (min-width: 1024px) 31vw, 50vw"
              position="object-top"
              className="transition-transform duration-700 ease-out group-hover:scale-[1.03]"
            />
            {/* A scrim only behind the text at the bottom, so it stays readable on any photo and the animal stays clear. */}
            <div className="absolute inset-0 bg-[linear-gradient(to_top,rgb(0_0_0/0.88),rgb(0_0_0/0.55)_30%,transparent_58%)]" />
          </div>
        ) : (
          <div aria-hidden className="grid-bg absolute inset-0 -z-10" />
        )}
        <Link
          href={`/species?group=${group.value}`}
          className="flex flex-col p-4 after:absolute after:inset-0 focus:outline-none sm:p-6"
        >
          <span className="text-lg font-bold leading-tight tracking-[-0.02em] text-white sm:text-2xl lg:text-[1.75rem]">{label}</span>
          <span className="figures mt-1 text-sm text-fog sm:text-[0.9375rem]">
            {group.count} species
          </span>
          <span aria-hidden className="more mt-2 min-h-0 group-hover:text-lime max-sm:hidden">See species</span>
        </Link>
      </div>
      {ex ? (
        <p className="mt-2.5 text-xs leading-snug text-muted">
          {ex.commonName ?? <i>{ex.scientificName}</i>}
        </p>
      ) : null}
    </div>
  );
}
