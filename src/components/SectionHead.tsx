/**
 * A section header: a 1px rule, an optional lime number (only where the sections are a real sequence, like a
 * profile's eight questions) and the heading in the display face. `aside` sits on the right, e.g. a "see all" link.
 */
export function SectionHead({
  id, title, n, aside, as: H = 'h2', className = '',
}: { id: string; title: string; n?: string; aside?: React.ReactNode; as?: 'h2' | 'h3'; className?: string }) {
  return (
    <div className={`flex flex-wrap items-end justify-between gap-x-6 gap-y-3 border-t border-lime pt-4 ${className}`}>
      <div className="min-w-0">
        {n ? <span aria-hidden className="mb-3 block font-mono text-sm text-lime">{n}</span> : null}
        <H id={id} className="h-section">{title}</H>
      </div>
      {aside ? <div className="pb-1">{aside}</div> : null}
    </div>
  );
}
