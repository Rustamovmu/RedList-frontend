import type { Metadata } from 'next';
import { AccountPanel } from '@/components/account/AccountPanel';
import { PageHeader } from '@/components/PageHeader';

export const metadata: Metadata = { title: 'Your account', robots: { index: false, follow: false } };

/** A visitor's own account (D-066). */
export default function AccountPage() {
  return (
    <>
      <PageHeader kicker="Account" title="Your account" />
      <div className="wrap mt-12">
        <AccountPanel />
      </div>
    </>
  );
}
