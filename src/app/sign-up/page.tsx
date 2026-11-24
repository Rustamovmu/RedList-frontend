import type { Metadata } from 'next';
import { SignUpForm } from '@/components/account/SignUpForm';
import { PageHeader } from '@/components/PageHeader';

export const metadata: Metadata = { title: 'Create an account', robots: { index: false, follow: false } };

/** Visitor sign-up (D-066). */
export default function SignUpPage() {
  return (
    <>
      <PageHeader kicker="Account" title="Create an account" lead="An account is optional: all of Wildward works without one." />
      <div className="wrap mt-12">
        <SignUpForm />
      </div>
    </>
  );
}
