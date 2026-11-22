import type { Metadata } from 'next';
import { StaffSessionProvider } from '@/components/admin/StaffSession';

export const metadata: Metadata = { title: 'Staff', robots: { index: false, follow: false } };

/** Staff area. Every action is authorized by the API (StaffGuard); this UI only hides what you cannot do. */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <p className="border-y border-rule bg-panel">
        <span className="wrap block py-2 text-xs font-bold uppercase tracking-[0.12em] text-lime">Staff area</span>
      </p>
      <div className="wrap max-w-6xl pt-8 text-[0.9375rem]">
        <StaffSessionProvider>{children}</StaffSessionProvider>
      </div>
    </div>
  );
}
