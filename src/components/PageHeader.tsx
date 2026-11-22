import { CornerArcs } from '@/components/shell/Curves';

/**
 * The top of an inner page: a navy band with a small kicker, the page's h1, an optional lead paragraph and optional
 * actions (children). Thin lime arcs sweep through the lower right corner as decoration.
 */
export function PageHeader({
  kicker, title, lead, children, titleClassName = 'max-w-[22ch]',
}: { kicker: string; title: React.ReactNode; lead?: React.ReactNode; children?: React.ReactNode; titleClassName?: string }) {
  return (
    <header className="relative isolate overflow-hidden border-b border-rule bg-panel">
      <CornerArcs id="page-arcs" className="absolute -right-40 -bottom-10 -z-10 h-[22rem] w-[40rem] sm:-right-16 lg:right-0 lg:h-[26rem] lg:w-[46rem]" />
      <div className="wrap pt-12 pb-14 md:pt-16 md:pb-20">
        <p className="kicker">{kicker}</p>
        <h1 className={`h-page mt-4 ${titleClassName}`}>{title}</h1>
        {lead ? <p className="lead mt-6">{lead}</p> : null}
        {children}
      </div>
    </header>
  );
}
