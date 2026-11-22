/**
 * A section heading: bold, sentence case, with an optional action on the right (e.g. "See all ›"). `n` adds a small
 * lime number above it, only where the sections are a real sequence (a profile's eight questions). `rule` adds a
 * hairline above, for long pages where sections follow each other closely.
 */
export function SectionHead({
  id, title, n, aside, as: H = 'h2', rule = false, className = '',
}: { id: string; title: string; n?: string; aside?: React.ReactNode; as?: 'h2' | 'h3'; rule?: boolean; className?: string }) {
  return (
    <div className={`flex flex-wrap items-end justify-between gap-x-6 gap-y-3 ${rule ? 'border-t border-rule pt-6' : ''} ${className}`}>
      <div className="min-w-0">
        {n ? <span aria-hidden className="figures mb-2 block text-sm font-bold text-lime">{n}</span> : null}
        <H id={id} className="h-section">{title}</H>
      </div>
      {aside ? <div>{aside}</div> : null}
    </div>
  );
}
