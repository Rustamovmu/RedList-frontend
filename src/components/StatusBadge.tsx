import { IUCN_LABEL, type IucnCategory } from '@/lib/iucn';

const STYLE: Record<IucnCategory, string> = {
  EX: 'bg-status-ex text-white',
  EW: 'bg-status-ew text-white',
  CR: 'bg-status-cr text-white',
  EN: 'bg-status-en text-white',
  VU: 'bg-status-vu text-white',
  NT: 'bg-status-nt text-white',
  LC: 'bg-status-lc text-white',
  DD: 'bg-status-dd text-white',
  NE: 'bg-status-ne text-ink ring-1 ring-inset ring-line',
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
      className={`inline-flex items-center gap-1.5 rounded-full font-medium ${STYLE[category]} ${
        size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm'
      }`}
    >
      <abbr title={label} className="no-underline font-semibold">
        {category}
      </abbr>
      <span>{label}</span>
      {year ? <span>· {year}</span> : null}
      {scope === 'regional' ? <span>· regional</span> : null}
    </span>
  );
}
