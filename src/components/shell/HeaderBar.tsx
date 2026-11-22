'use client';

import { useEffect, useState } from 'react';

/**
 * The sticky shell of the main navigation (D-049). At the top of the page it is transparent, so the page's opening band
 * or photo runs behind it. Once the page scrolls it turns solid black with a rule under it, so it stays readable over
 * any content.
 */
export function HeaderBar({ children }: { children: React.ReactNode }) {
  const [solid, setSolid] = useState(false);
  useEffect(() => {
    const update = () => setSolid(window.scrollY > 8);
    update();
    window.addEventListener('scroll', update, { passive: true });
    return () => window.removeEventListener('scroll', update);
  }, []);
  return (
    <header
      data-solid={solid ? '' : undefined}
      className="sticky top-0 z-30 border-b border-transparent transition-colors duration-200 motion-reduce:transition-none data-solid:border-rule data-solid:bg-black"
    >
      {children}
    </header>
  );
}
