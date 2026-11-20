'use client';

export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="mx-auto max-w-2xl px-4 py-20" role="alert">
      <h1 className="text-3xl font-semibold">Something went wrong</h1>
      <p className="mt-3 text-ink-muted">The page could not be loaded. You can try again.</p>
      <button onClick={reset} className="mt-6 rounded bg-forest px-4 py-2 text-paper hover:bg-forest-light">
        Try again
      </button>
    </div>
  );
}
