import type { Metadata } from 'next';
import { SignInForm } from '@/components/account/SignInForm';
import { PageHeader } from '@/components/PageHeader';

export const metadata: Metadata = { title: 'Sign in', robots: { index: false, follow: false } };

/** One sign-in form for everyone (D-066): staff go on to the staff area, visitors stay on the site. */
export default function SignInPage() {
  return (
    <>
      <PageHeader kicker="Account" title="Sign in" lead="Staff and visitors sign in here. An account is optional: all of Wildward works without one." />
      <div className="wrap mt-12">
        <SignInForm />
      </div>
    </>
  );
}
