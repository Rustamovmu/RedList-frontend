import Image from 'next/image';
import { mediaSrc } from '@/lib/media';

/**
 * A catalogue photo shown whole inside a fixed frame (DECISIONS D-039). The photo is never cropped, so the animal is
 * always fully visible. Where the photo's shape differs from the frame's, the space around it is filled with a blurred,
 * darkened copy of the same photo instead of empty bars, so every frame in a grid still looks full.
 *
 * Both layers use the same URL and `sizes`, so the browser downloads the photo once. The copy is decorative (empty alt,
 * hidden from assistive technology); the sharp layer carries the alt text.
 *
 * The parent sets the frame: it must be positioned, have a size (an aspect-ratio box or `absolute inset-0`) and clip
 * its overflow, because the blurred copy is scaled up so its soft edges stay outside the frame.
 */
export function WholePhoto({
  storageKey, alt, sizes, priority = false, eager = false, position = 'object-center', className = '',
}: {
  storageKey: string;
  alt: string;
  sizes: string;
  /** The page's main image (Largest Contentful Paint): preloaded. */
  priority?: boolean;
  /** In the first visible row: load at once, without a preload. */
  eager?: boolean;
  /** Where the whole photo sits when it does not fill the frame, e.g. `object-right`. */
  position?: string;
  /** Extra classes for the sharp layer, e.g. a hover zoom. */
  className?: string;
}) {
  const src = mediaSrc(storageKey);
  const loading = priority || eager ? 'eager' : 'lazy';
  return (
    <>
      <Image
        src={src}
        alt=""
        aria-hidden
        fill
        sizes={sizes}
        loading={loading}
        className="scale-125 object-cover blur-2xl brightness-[0.45] saturate-[1.2]"
      />
      <Image src={src} alt={alt} fill sizes={sizes} priority={priority} loading={priority ? undefined : loading} className={`object-contain ${position} ${className}`} />
    </>
  );
}
