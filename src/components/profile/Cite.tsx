/**
 * Numbered citation markers. Sources are numbered in the order of the "How do we know?" list.
 * Citations are never gated (PLAN §4): each marker links to the full source entry on the same page.
 */
export type SourceIndex = Map<string, { n: number; title: string }>;

export function Cite({ ids, index }: { ids: Array<string | null | undefined>; index: SourceIndex }) {
  const uniq = [...new Set(ids.filter((x): x is string => Boolean(x)))].map((id) => index.get(id)).filter((x) => x !== undefined);
  if (!uniq.length) return null;
  return (
    <span className="ml-1 whitespace-nowrap text-xs align-super">
      {uniq
        .sort((a, b) => a.n - b.n)
        .map((s, i) => (
          <span key={s.n}>
            {i > 0 ? ',' : null}
            <a href={`#source-${s.n}`} className="text-forest-light underline underline-offset-2" aria-label={`Source ${s.n}: ${s.title}`}>
              [{s.n}]
            </a>
          </span>
        ))}
    </span>
  );
}

/** An explicit empty state. "Unknown" and "Not yet documented" are information, not errors. */
export function Missing({ children }: { children: React.ReactNode }) {
  return <p className="italic text-ink-muted">{children}</p>;
}
