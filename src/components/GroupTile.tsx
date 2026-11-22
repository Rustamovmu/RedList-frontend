import Image from 'next/image';
import Link from 'next/link';
import type { components } from '@/contracts/api';
import { GROUP_LABEL } from '@/lib/labels';
import { mediaSrc } from '@/lib/media';

type Group = components['schemas']['GroupFacetDto'];

/**
 * A home-page tile for one animal group: its name and count over a photo of one of its species (the API picks it:
 * a sharp photo of the group's most widespread species). The photo is decoration here, because the link says what the
 * tile is. The caption names the species shown, so the photo is never read as the whole group, and carries the
 * credit, because attribution travels with the image (CC BY / BY-SA). Without a photo the tile is the plain panel.
 *
 * The photo sits at z -10 inside an isolated tile, so the link's text paints above it while the link's ::after
 * overlay can still make the whole tile clickable. The caption is positioned, so it stays above that overlay.
 */
export function GroupTile({ group }: { group: Group }) {
  const label = GROUP_LABEL[group.value as keyof typeof GROUP_LABEL] ?? group.value;
  const ex = group.example;
  return (
    <div className="group relative isolate flex h-full min-h-60 flex-col overflow-hidden border border-rule bg-panel outline-offset-2 outline-lime hover:border-lime focus-within:outline focus-within:outline-[3px] sm:min-h-72 lg:min-h-80">
      {ex ? (
        <div aria-hidden className="absolute inset-0 -z-10">
          <Image
            src={mediaSrc(ex.image.storageKey)}
            alt=""
            fill
            sizes="(min-width: 1440px) 30rem, (min-width: 640px) 33vw, 50vw"
            className="object-cover transition-transform duration-500 group-hover:scale-[1.04]"
          />
          {/*
            Dark scrims keep the name (top) and the count and credit (bottom) readable on any photo, even a white one.
            Narrow tiles wrap the credit onto more lines, so below lg the bottom scrim starts higher.
          */}
          <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgb(0_0_0/0.8),transparent_26%,transparent_30%,rgb(0_0_0/0.75)_46%,rgb(0_0_0/0.92)_70%)] lg:bg-[linear-gradient(to_bottom,rgb(0_0_0/0.8),transparent_35%,transparent_45%,rgb(0_0_0/0.8)_72%,rgb(0_0_0/0.92))]" />
        </div>
      ) : null}
      <Link
        href={`/species?group=${group.value}`}
        className="flex flex-1 flex-col justify-between gap-8 p-4 after:absolute after:inset-0 focus:outline-none"
      >
        <span className="font-mono text-sm font-bold uppercase tracking-[0.08em] text-white">{label}</span>
        <span className="flex items-baseline gap-2">
          <span className="type-display text-5xl leading-none text-lime">{group.count}</span>
          <span className={`font-mono text-xs ${ex ? 'text-fog' : 'text-muted'}`}>species</span>
        </span>
      </Link>
      {ex ? (
        <p className="relative px-4 pb-3 text-[0.6875rem] leading-snug text-fog">
          {ex.commonName ?? <i>{ex.scientificName}</i>} · {ex.image.credit}
        </p>
      ) : null}
    </div>
  );
}
