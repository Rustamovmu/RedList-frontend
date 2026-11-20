import { StatusBadge } from '@/components/StatusBadge';
import { apiGet } from '@/lib/api';
import { IUCN_CATEGORIES } from '@/lib/iucn';

// Foundation build: this page checks that the web app → API → PostgreSQL/PostGIS chain works
// and shows the design tokens. Milestone M2 replaces it with the real home page (docs/PLAN.md §4).
export const dynamic = 'force-dynamic';

async function systemStatus() {
  try {
    const r = await apiGet('/api/v1/health/ready', { revalidate: 0 });
    return { ok: true as const, detail: `PostGIS ${r.postgis.split(' ')[0]}` };
  } catch (e) {
    return { ok: false as const, detail: e instanceof Error ? e.message : 'unreachable' };
  }
}

export default async function Home() {
  const status = await systemStatus();
  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <p className="text-sm font-medium uppercase tracking-wider text-forest-light">Foundation build</p>
      <h1 className="mt-2 max-w-3xl text-4xl font-semibold sm:text-5xl">
        Understand a species, discover where it lives, and find a credible way to help.
      </h1>

      <section aria-labelledby="sys" className="mt-10 rounded-lg border border-line bg-white/60 p-5">
        <h2 id="sys" className="text-lg font-semibold">System check</h2>
        <p className="mt-2 flex items-center gap-2" role="status">
          <span aria-hidden className={`inline-block h-2.5 w-2.5 rounded-full ${status.ok ? 'bg-status-lc' : 'bg-status-cr'}`} />
          {status.ok ? `API and database connected (${status.detail})` : `API not reachable: ${status.detail}`}
        </p>
      </section>

      <section aria-labelledby="tokens" className="mt-8">
        <h2 id="tokens" className="text-lg font-semibold">Conservation status badges</h2>
        <ul className="mt-3 flex flex-wrap gap-2">
          {IUCN_CATEGORIES.map((c) => (
            <li key={c}>
              <StatusBadge category={c} />
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
