import type { Metadata } from 'next';
import Link from 'next/link';
import { InfoPage, InfoSection } from '@/components/InfoPage';
import { StatusBadge } from '@/components/StatusBadge';
import { IUCN_CATEGORIES } from '@/lib/iucn';

export const metadata: Metadata = {
  title: 'Methodology',
  description: 'How Wildward sources, records and reviews conservation status, population figures, places and photographs.',
  alternates: { canonical: '/methodology' },
};

export default function MethodologyPage() {
  return (
    <InfoPage
      kicker="Methodology"
      title="How we source facts"
      lead={
        <>
          Every status, number and photograph on Wildward is <strong>tied to a source you can check</strong>. These are the rules we follow.
        </>
      }
      updated="21 November 2026"
    >
      <InfoSection id="sources" title="Sources and citations">
        <ul>
          <li>Each fact is cited to the page or dataset it came from, with that source&apos;s own date and the date we read it. All citations are listed on <Link href="/sources">the sources page</Link>.</li>
          <li>Names, identifiers and classification come from the GBIF Backbone Taxonomy (CC BY 4.0). When sources disagree on a name, the profile says so.</li>
          <li>We write summaries in our own words. We do not copy text from sources.</li>
          <li>Some figures are second-hand, for example an IUCN Red List category as recorded on Wikidata. The source note on the profile says so, and these are replaced when someone checks the original.</li>
        </ul>
      </InfoSection>

      <InfoSection id="status" title="Conservation status">
        <ul className="plain flex flex-wrap gap-2 pb-2" aria-label="The nine categories">
          {IUCN_CATEGORIES.map((c) => (
            <li key={c}><StatusBadge category={c} /></li>
          ))}
        </ul>
        <p className="font-bold text-lime">Data Deficient and Not Evaluated are not low risk.</p>
        <ul>
          <li>Categories follow the IUCN Red List: Extinct, Extinct in the Wild, Critically Endangered, Endangered, Vulnerable, Near Threatened, Least Concern, Data Deficient and Not Evaluated.</li>
          <li>Each status shows its scope (global or regional) and, when known, the assessment date. A regional status is never shown as the global one.</li>
          <li>Data Deficient and Not Evaluated are not &ldquo;low risk&rdquo;. They are never grouped with Least Concern.</li>
          <li>A trend is shown only as the source reports it. We never infer a trend by comparing two estimates made with different methods.</li>
        </ul>
      </InfoSection>

      <InfoSection id="population" title="Population figures">
        <ul>
          <li>A population figure always keeps its unit: mature individuals, breeding pairs, all individuals, or another stated unit (for example females nesting each year).</li>
          <li>Each figure keeps its place (global or a named country or sea), whether it counts wild or captive animals, its reference year when known, and its uncertainty.</li>
          <li>We never add up overlapping figures, never turn a sighting count into a population, and never show a countdown.</li>
          <li>If no figure has been checked, the page says &ldquo;Unknown&rdquo;. Unknown is not zero.</li>
          <li>In <Link href="/compare">Compare</Link>, figures in different units are labelled &ldquo;Not directly comparable&rdquo;. There is no overall score and no winner.</li>
        </ul>
      </InfoSection>

      <InfoSection id="places" title="Where species live">
        <ul>
          <li>Country and ocean boundaries come from Natural Earth (public domain). Range maps are shown only when a licensed source provides one, and the map labels which kind you are seeing.</li>
          <li>When only countries are known, whole countries are shaded and the map says so. We never draw a range we do not have.</li>
          <li>For species at risk from collection or poaching, locations are shown only at country level or withheld entirely. Precise locations are never stored.</li>
        </ul>
      </InfoSection>

      <InfoSection id="photos" title="Photographs">
        <ul>
          <li>We use only images under CC0, the Public Domain Mark, CC BY or CC BY-SA. We do not use non-commercial or no-derivatives images.</li>
          <li>We check each licence on the file&apos;s source page and against the copyright notice embedded in the file. If the two disagree, we do not use the image.</li>
          <li>Every photo shows its creator and licence. Images are resized and re-encoded, which removes embedded data such as camera details and GPS position.</li>
        </ul>
      </InfoSection>

      <InfoSection id="review" title="Review and corrections">
        <ul>
          <li>Every profile is a reviewed version. The page shows its version, the review date and the reviewer&apos;s role, and says when an author published their own edit without independent review.</li>
          <li>Earlier versions are kept, and a previous version can be restored. Every change is recorded in an audit log.</li>
          <li>Three dates are kept apart: when the source was published, when we read it, and when we reviewed the profile.</li>
        </ul>
      </InfoSection>
    </InfoPage>
  );
}
