import type { Metadata } from 'next';
import { InfoPage, InfoSection } from '@/components/InfoPage';

export const metadata: Metadata = {
  title: 'Privacy',
  description: 'What Wildward stores about visitors: no accounts, no tracking cookies, no analytics.',
  alternates: { canonical: '/privacy' },
};

const contact = process.env.NEXT_PUBLIC_CONTACT_URL;

export default function PrivacyPage() {
  return (
    <InfoPage title="Privacy" lead="You can use all of Wildward without an account, and we do not track you." updated="21 November 2026">
      <InfoSection id="visitors" title="If you are a visitor">
        <ul>
          <li>No accounts, no sign-up and no newsletter.</li>
          <li>No analytics, no advertising and no tracking cookies. Wildward sets no cookies for visitors.</li>
          <li>All pages, photos and map data load from this site itself. Your browser makes no requests to other companies when you read a profile.</li>
          <li>Like any website, the server may keep short-lived technical logs (such as the time and address of a request) to keep the site running and secure. They are not used to profile visitors.</li>
        </ul>
      </InfoSection>

      <InfoSection id="browser" title="What stays in your browser">
        <ul>
          <li>The species you pick to compare are kept in your browser&apos;s local storage so the selection survives page changes. They are never sent to us except as part of the compare page&apos;s address, and you can clear them by removing the species.</li>
          <li>&ldquo;Near me&rdquo; on the map asks your browser for your position only when you press the button. Your position is matched to a country inside your browser and is never sent to us.</li>
        </ul>
      </InfoSection>

      <InfoSection id="links" title="Links to other sites">
        <p>
          Source links and support links take you to other websites, which have their own privacy policies. We send no referrer details with support
          links, and we do not track clicks.
        </p>
      </InfoSection>

      <InfoSection id="staff" title="If you are an editor">
        <p>
          Staff sign-in uses a session cookie and a security (CSRF) cookie, both needed to keep editing secure. We store editors&apos; names, email
          addresses and a securely hashed password, and an audit log of editorial actions.
        </p>
      </InfoSection>

      {contact ? (
        <InfoSection id="contact" title="Contact">
          <p>
            Questions about privacy: <a href={contact} rel="noopener noreferrer">contact</a>.
          </p>
        </InfoSection>
      ) : null}
    </InfoPage>
  );
}
