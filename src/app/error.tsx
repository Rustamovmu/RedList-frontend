'use client';

export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="wrap flex min-h-[60vh] flex-col items-center justify-center pt-12 text-center" role="alert">
      <p aria-hidden className="text-[clamp(6rem,20vw,13rem)] font-extrabold leading-none tracking-[-0.06em] text-lime">Oops</p>
      <h1 className="h-page mt-6">Something went wrong</h1>
      <p className="mt-4 text-lg text-muted">The page could not be loaded. You can try again.</p>
      <button onClick={reset} className="btn btn-primary mt-10">Try again</button>
    </div>
  );
}
