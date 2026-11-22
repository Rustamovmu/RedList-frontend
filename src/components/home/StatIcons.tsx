/**
 * Line icons for the home page's catalogue figures. Original drawings in one style (64px grid, 1.5px stroke,
 * round caps), decorative only. They are not taken from any icon set.
 */

const base = {
  viewBox: '0 0 64 64',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.5,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
  focusable: false,
};

/** An open field guide with a leaf on its right-hand page. */
export function GuideIcon({ className }: { className?: string }) {
  return (
    <svg {...base} className={className}>
      <path d="M6 15c9-3 18-2 26 4 8-6 17-7 26-4v35c-9-3-18-2-26 4-8-6-17-7-26-4z" />
      <path d="M32 19v35" />
      <path d="M12 24c5-1 10-.5 14 1.5M12 31c5-1 10-.5 14 1.5M12 38c5-1 10-.5 14 1.5" />
      <path d="M39 42c0-9 6-15 13-16 0 9-5 15-13 16z" />
      <path d="M39 42l9-11" />
    </svg>
  );
}

/** A warning triangle: species assessed as threatened. */
export function AlertIcon({ className }: { className?: string }) {
  return (
    <svg {...base} className={className}>
      <path d="M29.4 10.5a3 3 0 0 1 5.2 0l22.6 39a3 3 0 0 1-2.6 4.5H9.4a3 3 0 0 1-2.6-4.5z" />
      <path d="M32 24v14" />
      <circle cx="32" cy="45" r="1.25" fill="currentColor" />
    </svg>
  );
}

/** A globe with meridians and parallels: countries, seas and oceans. */
export function GlobeIcon({ className }: { className?: string }) {
  return (
    <svg {...base} className={className}>
      <circle cx="32" cy="32" r="24" />
      <ellipse cx="32" cy="32" rx="10.5" ry="24" />
      <path d="M32 8v48M8 32h48" />
      <path d="M12 20c12 4 28 4 40 0M12 44c12-4 28-4 40 0" />
    </svg>
  );
}

/** A branching tree of life: animal groups. */
export function BranchIcon({ className }: { className?: string }) {
  return (
    <svg {...base} className={className}>
      <path d="M32 56V40M32 40 18 26M32 40l14-14M18 26l-6-10M18 26l6-10M46 26l-6-10M46 26l6-10" />
      <circle cx="12" cy="13" r="3" />
      <circle cx="24" cy="13" r="3" />
      <circle cx="40" cy="13" r="3" />
      <circle cx="52" cy="13" r="3" />
      <path d="M24 56h16" />
    </svg>
  );
}
