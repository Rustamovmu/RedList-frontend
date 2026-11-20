import type { Metadata } from 'next';
import Link from 'next/link';
import { InfoPage, InfoSection } from '@/components/InfoPage';

export const metadata: Metadata = {
  title: 'About',
  description: 'What Wildward is, who it is for, and what it does not claim to be.',
  alternates: { canonical: '/about' },
};

const contact = process.env.NEXT_PUBLIC_CONTACT_URL;

export default function AboutPage() {
  return (
    <InfoPage
      title="About Wildward"
      lead="Wildward helps curious people understand a species, see where it lives, and find a credible way to help. Every fact on it links to the source it came from."
      updated="21 November 2026"
    >
      <InfoSection id="what" title="What this is">
        <p>
          Wildward is an independent, educational catalogue of animal species. It is built and run as a personal portfolio project, not by a
          conservation organization or a research institution. It is not affiliated with the IUCN, GBIF, Wikimedia or any organization listed on it.
        </p>
        <p>
          Each species profile answers eight questions in the same order: what it is, how threatened it is, how many remain, where it lives, what it
          eats, why it is threatened, how you can help, and how we know.
        </p>
      </InfoSection>

      <InfoSection id="who" title="Who it is for">
        <p>
          Students and curious learners first, and people who want to support conservation second. It is not a research-grade biodiversity database.
          For research, go to the primary sources each profile cites.
        </p>
      </InfoSection>

      <InfoSection id="limits" title="What it does not claim">
        <ul>
          <li>Coverage is partial. Counts on the site describe this catalogue, never the number of species in the world.</li>
          <li>Some facts are second-hand: a profile says so when a figure was taken from a summary (such as Wikidata or Wikipedia) rather than the original assessment.</li>
          <li>When a figure is not known or not yet checked, the page says &ldquo;Unknown&rdquo;. Unknown never means zero.</li>
          <li>Links in the <Link href="/support">support directory</Link> are reviewed, but that review is not a certification of any organization.</li>
        </ul>
      </InfoSection>

      <InfoSection id="more" title="More">
        <p>
          Read <Link href="/methodology">how we source and review facts</Link>, browse <Link href="/sources">every source we cite</Link>, or see our{' '}
          <Link href="/privacy">privacy</Link> and <Link href="/terms">terms</Link> pages.
          {contact ? (
            <>
              {' '}Questions and corrections: <a href={contact} rel="noopener noreferrer">contact</a>.
            </>
          ) : null}
        </p>
      </InfoSection>
    </InfoPage>
  );
}
