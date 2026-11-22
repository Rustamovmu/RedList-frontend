/**
 * Our curve motif (D-038): a wide downward curve traced by thin lime arcs that fade at both ends. Decorative only,
 * always aria-hidden. Each SVG on a page needs its own `id` prefix for its gradients.
 */

/**
 * The lower edge of the home hero. The SVG sits on the hero's bottom edge and paints the two lower corners in the
 * colour of the section below (`fill`), so the photo ends in a curve that is deepest in the middle. Two lime arcs
 * follow it. The strokes keep their width when the SVG is stretched.
 */
export function HeroCurve({ id, fill, className = '' }: { id: string; fill: string; className?: string }) {
  return (
    <svg aria-hidden focusable="false" viewBox="0 0 1440 160" preserveAspectRatio="none" className={`pointer-events-none block ${className}`}>
      <defs>
        <linearGradient id={`${id}-a`} gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="900" y2="0">
          <stop offset="0" style={{ stopColor: 'var(--color-lime)', stopOpacity: 0 }} />
          <stop offset="0.45" style={{ stopColor: 'var(--color-lime)', stopOpacity: 0.9 }} />
          <stop offset="1" style={{ stopColor: 'var(--color-lime)', stopOpacity: 0 }} />
        </linearGradient>
        <linearGradient id={`${id}-b`} gradientUnits="userSpaceOnUse" x1="700" y1="0" x2="1440" y2="0">
          <stop offset="0" style={{ stopColor: 'var(--color-lime)', stopOpacity: 0 }} />
          <stop offset="0.6" style={{ stopColor: 'var(--color-lime)', stopOpacity: 0.75 }} />
          <stop offset="1" style={{ stopColor: 'var(--color-lime)', stopOpacity: 0.15 }} />
        </linearGradient>
      </defs>
      <path d="M0 0 Q720 320 1440 0 V160 H0 Z" style={{ fill }} />
      <path d="M0 26 Q720 346 1440 26" fill="none" stroke={`url(#${id}-a)`} strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
      <path d="M0 -22 Q720 298 1440 -22" fill="none" stroke={`url(#${id}-b)`} strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

/** Three nested arcs for the corner of a page header band or a panel. */
export function CornerArcs({ id, className = '', color = 'var(--color-lime)' }: { id: string; className?: string; color?: string }) {
  return (
    <svg aria-hidden focusable="false" viewBox="0 0 720 400" fill="none" className={`pointer-events-none ${className}`}>
      <defs>
        <linearGradient id={id} gradientUnits="userSpaceOnUse" x1="80" y1="0" x2="720" y2="0">
          <stop offset="0" style={{ stopColor: color, stopOpacity: 0 }} />
          <stop offset="0.7" style={{ stopColor: color, stopOpacity: 0.55 }} />
          <stop offset="1" style={{ stopColor: color, stopOpacity: 0.9 }} />
        </linearGradient>
      </defs>
      <path d="M80 400 C 220 170, 470 70, 720 64" stroke={`url(#${id})`} strokeWidth="1.5" />
      <path d="M190 400 C 310 220, 510 130, 720 122" stroke={`url(#${id})`} strokeWidth="1.5" />
      <path d="M300 400 C 400 270, 560 190, 720 182" stroke={`url(#${id})`} strokeWidth="1.5" />
    </svg>
  );
}
