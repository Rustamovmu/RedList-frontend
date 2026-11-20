/** Layout for the static information pages (about, methodology, privacy, terms). */
export function InfoPage({ title, lead, updated, children }: { title: string; lead: string; updated: string; children: React.ReactNode }) {
  return (
    <article className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-3xl font-semibold sm:text-4xl">{title}</h1>
      <p className="mt-3 text-lg text-ink-muted">{lead}</p>
      <div className="prose-info mt-8 space-y-8">{children}</div>
      <p className="mt-12 border-t border-line pt-4 text-sm text-ink-muted">Last updated {updated}.</p>
    </article>
  );
}

export function InfoSection({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section aria-labelledby={id}>
      <h2 id={id} className="text-xl font-semibold">{title}</h2>
      <div className="mt-2 space-y-3 leading-relaxed [&_a]:underline [&_a]:underline-offset-4 [&_li]:ml-5 [&_li]:list-disc [&_ul]:space-y-1">{children}</div>
    </section>
  );
}
