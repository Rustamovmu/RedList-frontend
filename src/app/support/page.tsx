import type { Metadata } from 'next';
import Link from 'next/link';
import { connection } from 'next/server';
import { apiGet } from '@/lib/api';
import { ACTION_LABEL, formatDate } from '@/lib/labels';

export const metadata: Metadata = {
  title: 'Support directory',
  description: 'Reviewed ways to help: links to independent conservation organizations, and how we review them.',
  alternates: { canonical: '/support' },
};

export default async function SupportPage() {
  await connection(); // render per request (still cached by tag), so a build never bakes in an API outage
  const directory = await apiGet('/api/v1/support', { tags: ['support', 'catalogue'] }).catch(() => null);

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="text-3xl font-semibold">Support directory</h1>
      <p className="mt-2 text-ink-muted">
        Links to independent organizations, reviewed by our editors. A click takes you to the organization&apos;s own site. It is a referral, not a
        donation, and we do not handle money. We do not publish totals raised or rank organizations.
      </p>

      <section aria-labelledby="criteria-h" className="mt-8 rounded border border-line bg-white/60 p-4">
        <h2 id="criteria-h" className="text-xl font-semibold">How we review a link</h2>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
          <li>The link goes over a secure connection (https) to the organization&apos;s own website, and we show you that destination before you click.</li>
          <li>The page asks for the action we describe (for example volunteering or learning), and our description matches what the page says.</li>
          <li>An editor reviewed the organization and the link. Any edit sends it back for review before it is shown again.</li>
          <li>When we find that a link no longer works or no longer fits, we take it down straight away.</li>
        </ul>
        <p className="mt-3 text-sm text-ink-muted">
          Our review checks the link, not the organization&apos;s results. It is not a certification of how effective an organization is, and we
          make no claim about tax deductibility.
        </p>
      </section>

      <section aria-labelledby="orgs-h" className="mt-8">
        <h2 id="orgs-h" className="text-xl font-semibold">Organizations</h2>
        {directory === null ? (
          <p role="alert" className="mt-2 rounded border border-status-cr p-3 text-sm">The directory could not be loaded. This is a problem on our side.</p>
        ) : directory.organizations.length === 0 ? (
          <p className="mt-2 italic text-ink-muted">No organizations have been reviewed yet.</p>
        ) : (
          <ul className="mt-3 space-y-6">
            {directory.organizations.map((o) => (
              <li key={o.slug} className="rounded border border-line bg-white/60 p-4">
                <h3 className="font-serif text-lg font-semibold">{o.name}</h3>
                <p className="text-sm text-ink-muted">
                  Website: <a href={o.website} rel="noopener noreferrer" className="underline underline-offset-4">{o.websiteDomain}</a>
                  {o.reviewedAt ? <> · Reviewed {formatDate(o.reviewedAt)}</> : null}
                </p>
                <p className="mt-2 text-sm">{o.description}</p>
                <ul className="mt-3 space-y-3">
                  {o.links.map((l) => (
                    <li key={l.url} className="border-t border-line pt-3">
                      <a href={l.url} rel="noopener noreferrer" className="font-medium text-forest-light underline underline-offset-4">
                        {ACTION_LABEL[l.actionType]}: {o.name}
                      </a>
                      <span className="ml-2 text-sm text-ink-muted">(goes to {l.domain})</span>
                      <p className="mt-1 text-sm">{l.description}</p>
                      {l.species.length ? (
                        <p className="mt-1 text-sm text-ink-muted">
                          Shown on:{' '}
                          {l.species.map((sp, i) => (
                            <span key={sp.slug}>
                              {i ? ', ' : null}
                              <Link href={`/species/${sp.slug}`} className="underline underline-offset-2">{sp.commonName ?? sp.scientificName}</Link>
                            </span>
                          ))}
                        </p>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
