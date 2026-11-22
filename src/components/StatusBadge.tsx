import { IUCN_LABEL, type IucnCategory } from '@/lib/iucn';

const STYLE: Record<IucnCategory, string> = {
  EX: 'bg-status-ex text-white ring-1 ring-inset ring-muted',
  EW: 'bg-status-ew text-white',
  CR: 'bg-status-cr text-white',
  EN: 'bg-status-en text-white',
  VU: 'bg-status-vu text-white',
  NT: 'bg-status-nt text-white',
  LC: 'bg-status-lc text-white',
  DD: 'bg-status-dd text-white',
  NE: 'bg-status-ne text-black',
};

/** A 4px left edge in the status colour, for assessment rows. Supplementary only: the badge carries the text. */
export const STATUS_EDGE: Record<IucnCategory, string> = {
  EX: 'border-l-muted',
  EW: 'border-l-status-ew',
  CR: 'border-l-status-cr',
  EN: 'border-l-status-en',
  VU: 'border-l-status-vu',
  NT: 'border-l-status-nt',
  LC: 'border-l-status-lc',
  DD: 'border-l-status-dd',
  NE: 'border-l-white',
};

/** The small colour square beside a status filter option. Decorative: the label says the category. */
export const STATUS_SWATCH: Record<IucnCategory, string> = {
  EX: 'bg-status-ex ring-1 ring-muted',
  EW: 'bg-status-ew ring-1 ring-muted',
  CR: 'bg-status-cr',
  EN: 'bg-status-en',
  VU: 'bg-status-vu',
  NT: 'bg-status-nt',
  LC: 'bg-status-lc',
  DD: 'bg-status-dd',
  NE: 'bg-status-ne',
};

type Props = {
  category: IucnCategory;
  /** Year of the assessment. A category is never shown without its date in profiles. */
  year?: number;
  scope?: 'global' | 'regional';
  size?: 'sm' | 'md';
};

/** IUCN status badge. Colour is supplementary. The code and the full label are always present as text. */
export function StatusBadge({ category, year, scope = 'global', size = 'md' }: Props) {
  const label = IUCN_LABEL[category];
  return (
    <span
      className={`inline-flex flex-wrap items-center gap-x-1.5 font-mono leading-snug ${STYLE[category]} ${
        size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-[0.8125rem]'
      }`}
    >
      <abbr title={label} className="font-bold no-underline">
        {category}
      </abbr>
      <span>{label}</span>
      {year ? <span>· {year}</span> : null}
      {scope === 'regional' ? <span>· regional</span> : null}
    </span>
  );
}
