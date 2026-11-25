/**
 * The name in the logo (D-070): DM Serif Display, a high-contrast serif, with both W's in lime and the rest in the
 * surrounding text colour. The face has one weight (400), so `font-normal` keeps the browser from faking a bold.
 * The letters stay in one text run, so links and headings still read "Wildward".
 */
export function Wordmark({ className = '' }: { className?: string }) {
  return (
    <span className={`font-logo font-normal tracking-[-0.005em] ${className}`}>
      <span className="text-lime">W</span>ild<span className="text-lime">w</span>ard
    </span>
  );
}

/**
 * The Wildward mark (D-070): a ring around a sprig, one curved stem with two leaves. Traced from the owner's logo
 * image as original vector line art, so it stays sharp at every size. Decorative only; takes the text colour.
 */
export function Mark({ className = 'h-7 w-7' }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" fill="none" aria-hidden className={className}>
      <circle cx="16" cy="16" r="14.4" stroke="currentColor" strokeWidth="1.2" />
      <path d="M6.9 26.9C8.5 21.5 12 18.6 16.6 16.3S23.2 12 24.9 9.3" stroke="currentColor" strokeWidth="0.85" strokeLinecap="round" />
      <path d="M9.6 21.4Q11 20.9 12.6 21" stroke="currentColor" strokeWidth="0.6" strokeLinecap="round" />
      <path fill="currentColor" d="M12.9 17.3C12.3 14 13.8 11 18.6 7.9 18.9 11.5 17.5 14.5 12.9 17.3Z" />
      <path fill="currentColor" d="M12.3 21C14.5 18.6 18 18.6 20.6 20 18 22.4 14.5 22.6 12.3 21Z" />
    </svg>
  );
}
