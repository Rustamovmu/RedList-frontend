import Image from 'next/image';
import { licenceUrl, mediaSrc } from '@/lib/media';

/**
 * A catalogue photograph with its attribution (PLAN §4 "photo with credit", §8). The credit and licence are
 * the snapshot stored with the published revision, so later edits to the image record never change this page.
 *
 * By default the photo fills a fixed `aspect` box and is cropped to it. With `fit` (the photo's own pixel size)
 * the whole photo is shown uncropped at its own aspect ratio: as wide as its container allows, but never taller
 * than the CSS variable --photo-max-h, which the parent sets. The credit line then spans the photo's width.
 */
export function Photo({
  storageKey, altText, credit, license, sourceUrl, caption, sizes, priority = false, aspect = 'aspect-[16/9]', fit, className,
}: {
  storageKey: string;
  altText: string;
  credit: string;
  license: string;
  sourceUrl?: string | null;
  caption?: string | null;
  sizes: string;
  priority?: boolean;
  aspect?: string;
  fit?: { width: number; height: number };
  className?: string;
}) {
  const deed = licenceUrl(license);
  const creditHasLicence = credit.toLowerCase().includes(license.toLowerCase());
  const natural = fit && fit.width > 0 && fit.height > 0 ? fit : null;
  return (
    <figure
      className={className}
      style={natural ? { width: `min(100%, calc(var(--photo-max-h, 100svh) * ${(natural.width / natural.height).toFixed(4)}))` } : undefined}
    >
      <div
        className={`relative w-full overflow-hidden bg-panel ${natural ? '' : aspect}`}
        style={natural ? { aspectRatio: `${natural.width} / ${natural.height}` } : undefined}
      >
        <Image src={mediaSrc(storageKey)} alt={altText} fill sizes={sizes} priority={priority} className="object-cover" />
      </div>
      <figcaption className="mt-2 font-mono text-xs leading-relaxed text-muted">
        {caption ? <span className="mr-1 text-fog">{caption}</span> : null}
        <span>{credit}</span>
        {creditHasLicence && !deed ? null : (
          <>
            {' · '}
            {deed ? (
              <a href={deed} rel="noopener noreferrer license" className="text-lime underline underline-offset-2">{license}</a>
            ) : (
              license
            )}
          </>
        )}
        {sourceUrl ? (
          <>
            {' · '}
            <a href={sourceUrl} rel="noopener noreferrer" className="text-lime underline underline-offset-2">Source</a>
          </>
        ) : null}
      </figcaption>
    </figure>
  );
}
