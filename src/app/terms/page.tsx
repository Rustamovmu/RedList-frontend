import type { Metadata } from 'next';
import Link from 'next/link';
import { InfoPage, InfoSection } from '@/components/InfoPage';

export const metadata: Metadata = {
  title: 'Terms of use',
  description: 'How you may use Wildward and the material on it, including photo licences and data attribution.',
  alternates: { canonical: '/terms' },
};

export default function TermsPage() {
  return (
    <InfoPage title="Terms of use" lead="Wildward is an educational portfolio project, offered as is." updated="21 November 2026">
      <InfoSection id="use" title="Using the site">
        <ul>
          <li>Wildward is for learning and general information. It is not scientific, legal or professional advice. For decisions that matter, check the primary sources each profile cites.</li>
          <li>We work to keep facts accurate and cited, but we cannot guarantee that every figure is complete or current. Sources are revised over time.</li>
          <li>The site is provided as is, without any warranty, and may change or go offline.</li>
        </ul>
      </InfoSection>

      <InfoSection id="photos" title="Photographs">
        <p>
          Photographs belong to their creators and are used under the licence shown under each one (CC0, Public Domain Mark, CC BY or CC BY-SA). If
          you reuse a photograph, follow that licence: credit the creator, link the licence, and for CC BY-SA share your adaptation under the same
          licence. We resized and re-encoded each image.
        </p>
      </InfoSection>

      <InfoSection id="data" title="Data from other sources">
        <ul>
          <li>Names and classification: GBIF Backbone Taxonomy, CC BY 4.0 (doi:10.15468/39omei).</li>
          <li>Statements taken from Wikidata are CC0. Wikipedia articles cited as sources are CC BY-SA; we use the facts they report, not their text.</li>
          <li>Boundaries: Natural Earth, public domain.</li>
          <li>Other sources are listed, with their licences, on <Link href="/sources">the sources page</Link>. Their own terms apply to them.</li>
        </ul>
      </InfoSection>

      <InfoSection id="links" title="Links to other sites">
        <p>
          We link to other websites, including conservation organizations in the <Link href="/support">support directory</Link>. We do not control
          those sites and are not responsible for their content. Listing an organization is not an endorsement or a certification, and a click is not a
          donation.
        </p>
      </InfoSection>
    </InfoPage>
  );
}
