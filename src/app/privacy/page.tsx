import type { Metadata } from 'next';
import { InfoPage, InfoSection } from '@/components/InfoPage';

export const metadata: Metadata = {
  title: 'Privacy',
  description: 'What Wildward stores about visitors: accounts are optional, no tracking cookies, no analytics.',
  alternates: { canonical: '/privacy' },
};

const contact = process.env.NEXT_PUBLIC_CONTACT_URL;

export default function PrivacyPage() {
  return (
    <InfoPage
      kicker="Legal"
      title="Privacy"
      lead={
        <>
          You can use all of Wildward <strong>without an account</strong>, and <strong>we do not track you</strong>.
        </>
      }
      updated="25 November 2026"
      summary={
        <p className="notice bg-black/40 text-[0.9375rem] font-semibold leading-relaxed text-white">
          In short: accounts are optional · no tracking cookies · no analytics · your location never leaves your browser
        </p>
      }
    >
      <InfoSection id="visitors" title="If you are a visitor">
        <ul>
          <li>No newsletter. An account is optional: without one, everything on the site works the same.</li>
          <li>No analytics, no advertising and no tracking cookies. Wildward sets no cookies unless you sign in.</li>
          <li>All pages, photos and map data load from this site itself. Your browser makes no requests to other companies when you read a profile.</li>
          <li>Like any website, the server may keep short-lived technical logs (such as the time and address of a request) to keep the site running and secure. They are not used to profile visitors.</li>
        </ul>
      </InfoSection>

      <InfoSection id="accounts" title="If you create an account">
        <p>An account is optional. When you create one, we store:</p>
        <ul>
          <li>the name and email address you give, and when the account was created;</li>
          <li>your password only as a secure hash (Argon2id), never the password itself;</li>
          <li>
            for each browser where you are signed in: a hash of its session token, a security (CSRF) token, and when the session started, was last used
            and ends. No IP address or browser details are stored with it.
          </li>
        </ul>
        <p>
          Signing in sets a session cookie and a security (CSRF) cookie. Both are needed to keep your account secure, and both are removed when you sign
          out. A session ends after 7 days without use, and after 30 days in any case.
        </p>
        <p>
          We use your email address only to sign you in. It is not shown to anyone else. Wildward sends no email, and does not check that the address is
          yours.
        </p>
        <p>
          You can delete your account at any time on your account page. The account and all its sessions are deleted at once. Copies may remain in
          server backups made before then, until those backups are deleted. If the site is ever restored from such a backup, the account comes back
          with it, and you can delete it again.
        </p>
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
          Staff sign-in uses a session cookie and a security (CSRF) cookie, both needed to keep editing secure. After a successful sign-in the
          browser also keeps a device cookie for up to 180 days, so that someone else&apos;s failed attempts cannot lock that editor out. We store
          editors&apos; names, email addresses and a securely hashed password, an audit log of editorial actions, for each sign-in session its start
          and expiry times and the browser&apos;s user-agent string, and for each device cookie only a hash of it and when it was last used.
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
