'use client';

export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="wrap flex min-h-[60vh] flex-col items-center justify-center pt-12 text-center" role="alert">
      <p aria-hidden className="type-display text-[clamp(8rem,30vw,20rem)] leading-[0.8] text-lime">Err</p>
      <h1 className="type-display mt-8 text-[clamp(2.5rem,6vw,4.5rem)] text-fog">Something went wrong</h1>
      <p className="mt-4 text-muted">The page could not be loaded. You can try again.</p>
      <button onClick={reset} className="btn btn-primary mt-10">Try again</button>
    </div>
  );
}
