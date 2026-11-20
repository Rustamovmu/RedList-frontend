import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-20">
      <h1 className="text-3xl font-semibold">Page not found</h1>
      <p className="mt-3 text-ink-muted">This page doesn&apos;t exist, or it hasn&apos;t been built yet.</p>
      <Link href="/" className="mt-6 inline-block text-forest-light underline underline-offset-4">Back to home</Link>
    </div>
  );
}
