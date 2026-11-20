import Link from 'next/link';

export function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-line bg-paper-deep">
      <div className="mx-auto grid max-w-6xl gap-6 px-4 py-8 text-sm text-ink-muted sm:grid-cols-2">
        <p>
          Wildward is an independent educational catalogue. It is not affiliated with the IUCN or any organization listed on it.
          Catalogue figures describe this site&apos;s coverage, not global biodiversity totals.
        </p>
        <ul className="flex flex-wrap gap-x-4 gap-y-1 sm:justify-end">
          <li><Link href="/methodology" className="hover:underline">Methodology</Link></li>
          <li><Link href="/sources" className="hover:underline">Sources</Link></li>
          <li><Link href="/support" className="hover:underline">Support directory</Link></li>
          <li><Link href="/privacy" className="hover:underline">Privacy</Link></li>
          <li><Link href="/terms" className="hover:underline">Terms</Link></li>
        </ul>
      </div>
    </footer>
  );
}
