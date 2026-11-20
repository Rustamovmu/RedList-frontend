/** The next/image `src` for a stored image. The loader (image-loader.ts) adds the width. */
export function mediaSrc(storageKey: string): string {
  if (!/^[a-f0-9]{64}$/.test(storageKey)) throw new Error('Unexpected storage key');
  return `/api/v1/media/${storageKey}`;
}

/** Licence deed for the allow-listed licences (CC0, PDM, CC BY, CC BY-SA). Unknown text gets no link. */
export function licenceUrl(licence: string): string | null {
  const n = licence.trim().toUpperCase().replace(/[\s_]+/g, '-');
  if (/^CC0(-1\.0)?$/.test(n)) return 'https://creativecommons.org/publicdomain/zero/1.0/';
  if (/^(PDM|PUBLIC-DOMAIN-MARK)(-1\.0)?$/.test(n)) return 'https://creativecommons.org/publicdomain/mark/1.0/';
  const m = /^CC-BY(-SA)?-(\d\.\d)$/.exec(n);
  if (m) return `https://creativecommons.org/licenses/${m[1] ? 'by-sa' : 'by'}/${m[2]}/`;
  return null;
}
