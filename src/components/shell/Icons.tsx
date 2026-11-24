/** Small UI icons, decorative only (the control's text names it). */

/** Four small squares: "open the catalogue". */
export function GridIcon({ className = 'h-3 w-3' }: { className?: string }) {
  return (
    <svg viewBox="0 0 12 12" aria-hidden focusable="false" className={`fill-current ${className}`}>
      <rect x="0" y="0" width="5" height="5" />
      <rect x="7" y="0" width="5" height="5" />
      <rect x="0" y="7" width="5" height="5" />
      <rect x="7" y="7" width="5" height="5" />
    </svg>
  );
}

/** A magnifying glass. */
export function SearchIcon({ className = 'h-6 w-6' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden focusable="false" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" className={className}>
      <circle cx="10.5" cy="10.5" r="6.5" />
      <path d="m15.5 15.5 5 5" />
    </svg>
  );
}

/** A right-pointing chevron, for list rows that lead somewhere. */
export function Chevron({ className = '' }: { className?: string }) {
  return <span aria-hidden className={`inline-block h-2 w-2 shrink-0 rotate-45 border-t-2 border-r-2 border-current ${className}`} />;
}

/** A head and shoulders: "your account". */
export function PersonIcon({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" aria-hidden focusable="false" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" className={`shrink-0 ${className}`}>
      <circle cx="8" cy="5" r="3" />
      <path d="M2.5 14.5c.6-3 2.8-4.5 5.5-4.5s4.9 1.5 5.5 4.5" />
    </svg>
  );
}
