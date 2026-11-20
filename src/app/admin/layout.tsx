import type { Metadata } from 'next';
import { StaffSessionProvider } from '@/components/admin/StaffSession';

export const metadata: Metadata = { title: 'Staff', robots: { index: false, follow: false } };

/** Staff area. Every action is authorized by the API (StaffGuard); this UI only hides what you cannot do. */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <StaffSessionProvider>{children}</StaffSessionProvider>
    </div>
  );
}
