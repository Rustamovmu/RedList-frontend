import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="wrap flex min-h-[60vh] flex-col items-center justify-center pt-12 text-center">
      <p aria-hidden className="figures text-[clamp(6rem,20vw,13rem)] font-extrabold leading-none tracking-[-0.06em] text-lime">404</p>
      <h1 className="h-page mt-6">Page not found</h1>
      <p className="mt-4 text-lg text-muted">This page doesn&apos;t exist, or it hasn&apos;t been built yet.</p>
      <div className="mt-10 flex flex-wrap justify-center gap-3">
        <Link href="/" className="btn btn-primary">Back to home</Link>
        <Link href="/species" className="btn btn-secondary">Explore species</Link>
        <Link href="/map" className="btn btn-secondary">Map</Link>
      </div>
    </div>
  );
}
