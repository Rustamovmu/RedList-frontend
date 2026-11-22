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
    <div className="wrap pt-10 md:pt-16">
      <p className="kicker">Help</p>
      <h1 className="h-page mt-3 max-w-[12ch]">Support directory</h1>
      <p className="lead mt-8">
        Links to independent organizations, reviewed by our editors. A click takes you to the organization&apos;s own site. It is a referral, not a
        donation, and we do not handle money.
      </p>
      <p className="prose-measure mt-4 text-muted">We do not publish totals raised or rank organizations.</p>

      <section aria-labelledby="criteria-h" className="mt-16 border-t-2 border-lime bg-panel px-6 py-8 md:px-10 md:py-10">
        <h2 id="criteria-h" className="type-display text-[clamp(2rem,4vw,3rem)] text-white">How we review a link</h2>
        <ol className="mt-8 grid gap-x-12 gap-y-8 md:grid-cols-2">
          {CRITERIA.map((c, i) => (
            <li key={c} className="grid grid-cols-[2.5rem_1fr] border-t border-rule pt-4">
              <span aria-hidden className="font-mono text-sm text-lime">{String(i + 1).padStart(2, '0')}</span>
              <span className="text-fog">{c}</span>
            </li>
          ))}
        </ol>
        <p className="prose-measure mt-8 text-[0.9375rem] text-muted">
          Our review checks the link, not the organization&apos;s results. It is not a certification of how effective an organization is, and we
          make no claim about tax deductibility.
        </p>
      </section>

      <section aria-labelledby="orgs-h" className="mt-24">
        <div className="border-t border-lime pt-4">
          <h2 id="orgs-h" className="h-section">Organizations</h2>
        </div>
        {directory === null ? (
          <p role="alert" className="notice-error mt-8">The directory could not be loaded. This is a problem on our side.</p>
        ) : directory.organizations.length === 0 ? (
          <p className="missing mt-8">No organizations have been reviewed yet.</p>
        ) : (
          <ul className="mt-8 space-y-6">
            {directory.organizations.map((o) => (
              <li key={o.slug} className="panel px-6 py-7 md:px-8">
                <h3 className="type-display text-[clamp(1.75rem,3.5vw,2.75rem)] leading-[0.95] text-white">{o.name}</h3>
                <p className="meta mt-3">
                  Website: <a href={o.website} rel="noopener noreferrer" className="text-lime underline underline-offset-4">{o.websiteDomain}</a>
                  {o.reviewedAt ? <> · Reviewed {formatDate(o.reviewedAt)}</> : null}
                </p>
                <p className="prose-measure mt-4 text-fog">{o.description}</p>
                <ul className="mt-6 border-t border-rule">
                  {o.links.map((l) => (
                    <li key={l.url} className="border-b border-rule py-5 last:border-b-0 last:pb-0">
                      <p className="kicker">{ACTION_LABEL[l.actionType]}</p>
                      <a href={l.url} rel="noopener noreferrer" className="mt-2 inline-block text-lg font-medium text-lime underline decoration-1 underline-offset-4 hover:decoration-2">
                        {ACTION_LABEL[l.actionType]}: {o.name}<span aria-hidden> ↗</span>
                      </a>
                      <span className="mt-1 block font-mono text-xs text-muted">(goes to {l.domain})</span>
                      <p className="prose-measure mt-3 text-[0.9375rem]">{l.description}</p>
                      {l.species.length ? (
                        <p className="mt-2 text-[0.9375rem] text-muted">
                          Shown on:{' '}
                          {l.species.map((sp, i) => (
                            <span key={sp.slug}>
                              {i ? ', ' : null}
                              <Link href={`/species/${sp.slug}`} className="text-lime underline underline-offset-2">{sp.commonName ?? sp.scientificName}</Link>
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

const CRITERIA = [
  'The link goes over a secure connection (https) to the organization’s own website, and we show you that destination before you click.',
  'The page asks for the action we describe (for example volunteering or learning), and our description matches what the page says.',
  'An editor reviewed the organization and the link. Any edit sends it back for review before it is shown again.',
  'When we find that a link no longer works or no longer fits, we take it down straight away.',
];
