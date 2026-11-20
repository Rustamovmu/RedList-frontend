import Link from 'next/link';

const NAV = [
  { href: '/species', label: 'Explore' },
  { href: '/map', label: 'Map' },
  { href: '/compare', label: 'Compare' },
  { href: '/about', label: 'About' },
];

export function SiteHeader() {
  return (
    <header className="bg-forest text-paper">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-6 gap-y-2 px-4 py-3">
        <Link href="/" className="font-serif text-xl font-semibold tracking-tight">
          Wildward
        </Link>
        <nav aria-label="Main">
          <ul className="flex flex-wrap gap-x-5 gap-y-1 text-sm">
            {NAV.map((n) => (
              <li key={n.href}>
                <Link href={n.href} className="rounded px-1 py-1 hover:underline underline-offset-4">
                  {n.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </header>
  );
}
