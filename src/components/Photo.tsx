import Image from 'next/image';
import { WholePhoto } from '@/components/WholePhoto';
import { mediaSrc } from '@/lib/media';

/**
 * A catalogue photograph with its optional caption. Its attribution is not printed under the photo: the profile lists it
 * under Sources ("Photographs") and /credits lists every photo's credit, licence and source (D-055).
 *
 * By default the photo sits whole inside a fixed `aspect` box (WholePhoto: never cropped). With `fit` (the photo's own pixel size)
 * the whole photo is shown uncropped at its own aspect ratio: as wide as its container allows, but never taller
 * than the CSS variable --photo-max-h, which the parent sets. The caption then spans the photo's width.
 */
export function Photo({
  storageKey, altText, caption, sizes, priority = false, aspect = 'aspect-[16/9]', fit, className,
}: {
  storageKey: string;
  altText: string;
  caption?: string | null;
  sizes: string;
  priority?: boolean;
  aspect?: string;
  fit?: { width: number; height: number };
  className?: string;
}) {
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
        {natural ? (
          // The box already has the photo's own shape, so nothing is cut off.
          <Image src={mediaSrc(storageKey)} alt={altText} fill sizes={sizes} priority={priority} className="object-cover" />
        ) : (
          <WholePhoto storageKey={storageKey} alt={altText} sizes={sizes} priority={priority} />
        )}
      </div>
      {caption ? <figcaption className="mt-2.5 text-[0.8125rem] leading-relaxed font-medium text-fog">{caption}</figcaption> : null}
    </figure>
  );
}
