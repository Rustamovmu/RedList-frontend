/**
 * next/image loader for catalogue media (PLAN §3 "Images"). Images are always served same-origin by our own
 * API (/api/v1/media/<storageKey>/<width>.webp), so a published page never loads anything from a third party.
 * The API picks the nearest generated WebP width at least as wide as requested.
 * `src` is `/api/v1/media/<storageKey>`, built by mediaSrc().
 */
export default function mediaLoader({ src, width }: { src: string; width: number; quality?: number }): string {
  return `${src}/${width}.webp`;
}
