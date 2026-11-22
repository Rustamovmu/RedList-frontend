/** The Wildward mark: a circle crossed by one curved leaf vein. Original line art, decorative only. */
export function Mark({ className = 'h-7 w-7' }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="square" aria-hidden className={className}>
      <circle cx="16" cy="16" r="13" />
      <path d="M6.5 25.5C11 21 14.5 15 25.5 6.5" />
      <path d="M12.2 19.6 11.4 13.4M15.6 15.9 16.6 10.2M15.6 15.9 21.4 16.4M12.2 19.6 18.2 20.6" />
    </svg>
  );
}
