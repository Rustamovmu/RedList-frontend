import Image from 'next/image';
import { CornerArcs } from '@/components/shell/Curves';

/** A fixed photo behind the header (not catalogue media). `position` is a Tailwind object-position class. */
export type HeaderImage = { src: string; alt: string; position?: string; caption: string };

/**
 * The top of an inner page, sliding up under the transparent main navigation (D-049): a navy band with a small kicker, the page's h1, an optional lead paragraph and optional
 * actions (children). Thin lime arcs sweep through the lower right corner as decoration. With `image` (D-048, D-053) the
 * band is a tall hero: the photo fills it at full colour, with no wash over it, and the text sits in its lower part over
 * a soft black gradient that is only as dark as readability needs.
 */
export function PageHeader({
  kicker, title, lead, children, titleClassName = 'max-w-[22ch]', image,
}: { kicker: string; title: React.ReactNode; lead?: React.ReactNode; children?: React.ReactNode; titleClassName?: string; image?: HeaderImage }) {
  // Over a photo the kicker, title and lead carry a soft shadow (not the children, so form fields stay clean).
  const shadow = image ? '[text-shadow:0_2px_20px_rgb(0_0_0/0.6)]' : '';
  return (
    <header className={`relative isolate -mt-[var(--nav-h)] overflow-hidden border-b border-rule bg-panel ${image ? 'flex min-h-[max(34rem,80svh)] flex-col justify-end' : ''}`}>
      {image ? (
        <figure className="absolute inset-0 -z-10 m-0">
          {/* A fixed file, not catalogue media, so the media loader does not apply (unoptimized). */}
          <Image
            src={image.src}
            alt={image.alt}
            fill
            priority
            unoptimized
            sizes="100vw"
            className={`hero-in object-cover ${image.position ?? 'object-center'}`}
          />
          {/* No wash over the whole photo. Only the text area darkens: from the bottom on phones (higher there, because the text covers most of the band), and from the bottom-left
              corner from md up, where the kicker, title, lead and search sit. A soft band at the top carries the nav. */}
          <div aria-hidden className="absolute inset-0 bg-linear-to-t from-black/85 via-black/60 via-55% to-black/15 md:from-black/80 md:via-black/45 md:via-40% md:to-transparent md:to-70%" />
          <div aria-hidden className="absolute inset-0 hidden bg-linear-to-r from-black/55 via-black/20 via-40% to-transparent to-65% md:block" />
          <div aria-hidden className="absolute inset-x-0 top-0 h-[calc(var(--nav-h)*1.75)] bg-linear-to-b from-black/50 to-transparent" />
          <figcaption className="absolute inset-x-0 bottom-2">
            <div className="wrap flex justify-end">
              <p className="text-right text-[0.6875rem] leading-relaxed text-fog sm:text-xs">{image.caption}</p>
            </div>
          </figcaption>
        </figure>
      ) : (
        <CornerArcs id="page-arcs" className="absolute -right-40 -bottom-10 -z-10 h-[22rem] w-[40rem] sm:-right-16 lg:right-0 lg:h-[26rem] lg:w-[46rem]" />
      )}
      <div className={`wrap pt-[calc(var(--nav-h)+3rem)] pb-14 md:pt-[calc(var(--nav-h)+4rem)] md:pb-20 ${image ? 'w-full' : ''}`}>
        <p className={`kicker ${shadow}`}>{kicker}</p>
        {/* Over a photo the title is a size larger and the lead is white and a step larger (D-054). */}
        <h1 className={`h-page mt-4 ${image ? 'text-[clamp(3rem,7.5vw,6.5rem)]' : ''} ${titleClassName} ${shadow}`}>{title}</h1>
        {lead ? <p className={`lead mt-6 ${image ? 'text-white sm:text-[1.375rem]' : ''} ${shadow}`}>{lead}</p> : null}
        {children}
      </div>
    </header>
  );
}
