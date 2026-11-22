import type { Metadata } from 'next';
import Link from 'next/link';
import { connection } from 'next/server';
import { PageHeader } from '@/components/PageHeader';
import { SectionHead } from '@/components/SectionHead';
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
    <div>
      <PageHeader
        kicker="Help"
        title="Support directory"
        lead={
          <>
            Links to <strong>independent organizations</strong>, reviewed by our editors. A click takes you to the organization&apos;s own site. It is a <strong>referral, not a
            donation</strong>, and we do not handle money.
          </>
        }
      >
        <p className="prose-measure mt-4 text-muted">We do not publish totals raised or rank organizations.</p>
      </PageHeader>

      <div className="wrap">
        <section aria-labelledby="criteria-h" className="mt-16 grid gap-x-16 gap-y-8 lg:mt-24 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
          <div>
            <h2 id="criteria-h" className="h-section">How we review a link</h2>
            <p className="mt-5 max-w-[40ch] text-[0.9375rem] leading-relaxed text-muted">
              Our review checks the link, not the organization&apos;s results. It is not a certification of how effective an organization is, and we
              make no claim about tax deductibility.
            </p>
          </div>
          <ol className="grid gap-x-10 gap-y-8 sm:grid-cols-2">
            {CRITERIA.map((c, i) => (
              <li key={c} className="border-t border-rule pt-5">
                <span aria-hidden className="figures block text-sm font-bold text-lime">{String(i + 1).padStart(2, '0')}</span>
                <span className="mt-3 block text-[1.0625rem] leading-relaxed text-fog">{c}</span>
              </li>
            ))}
          </ol>
        </section>

        <section aria-labelledby="orgs-h" className="mt-24 lg:mt-32">
          <SectionHead id="orgs-h" title="Organizations" rule />
          {directory === null ? (
            <p role="alert" className="notice-error mt-8">The directory could not be loaded. This is a problem on our side.</p>
          ) : directory.organizations.length === 0 ? (
            <p className="missing mt-8">No organizations have been reviewed yet.</p>
          ) : (
            <ul className="mt-8 space-y-6">
              {directory.organizations.map((o) => (
                <li key={o.slug} className="panel px-6 py-7 md:px-8">
                  <h3 className="text-[clamp(1.5rem,2.6vw,2rem)] font-bold leading-tight tracking-[-0.02em] text-white">{o.name}</h3>
                  <p className="meta mt-3">
                    Website: <a href={o.website} rel="noopener noreferrer" className="text-lime underline underline-offset-4">{o.websiteDomain}</a>
                    {o.reviewedAt ? <> · Reviewed {formatDate(o.reviewedAt)}</> : null}
                  </p>
                  <p className="prose-measure mt-4 text-fog">{o.description}</p>
                  <ul className="mt-6 border-t border-rule">
                    {o.links.map((l) => (
                      <li key={l.url} className="border-b border-rule py-5 last:border-b-0 last:pb-0">
                        <p className="kicker">{ACTION_LABEL[l.actionType]}</p>
                        <a href={l.url} rel="noopener noreferrer" className="mt-2 inline-block text-lg font-semibold text-lime underline decoration-1 underline-offset-4 hover:decoration-2">
                          {ACTION_LABEL[l.actionType]}: {o.name}<span aria-hidden> ↗</span>
                        </a>
                        <span className="mt-1 block text-[0.8125rem] text-muted">(goes to {l.domain})</span>
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
    </div>
  );
}

const CRITERIA = [
  'The link goes over a secure connection (https) to the organization’s own website, and we show you that destination before you click.',
  'The page asks for the action we describe (for example volunteering or learning), and our description matches what the page says.',
  'An editor reviewed the organization and the link. Any edit sends it back for review before it is shown again.',
  'When we find that a link no longer works or no longer fits, we take it down straight away.',
];
