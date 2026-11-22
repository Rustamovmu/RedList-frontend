import Image from 'next/image';
import { licenceUrl, mediaSrc } from '@/lib/media';

/**
 * A catalogue photograph with its attribution (PLAN §4 "photo with credit", §8). The credit and licence are
 * the snapshot stored with the published revision, so later edits to the image record never change this page.
 */
export function Photo({
  storageKey, altText, credit, license, sourceUrl, caption, sizes, priority = false, aspect = 'aspect-[16/9]',
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
}) {
  const deed = licenceUrl(license);
  const creditHasLicence = credit.toLowerCase().includes(license.toLowerCase());
  return (
    <figure>
      <div className={`relative w-full overflow-hidden bg-panel ${aspect}`}>
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
