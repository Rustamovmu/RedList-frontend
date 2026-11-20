import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Cite, Missing, type SourceIndex } from '@/components/profile/Cite';
import { StatusBadge } from '@/components/StatusBadge';
import type { components } from '@/contracts/api';
import { ApiError, apiGet } from '@/lib/api';
import {
  ACTION_LABEL, BASIS_LABEL, ENVIRONMENT_LABEL, estimateValue, formatDate, GROUP_LABEL, ORIGIN_LABEL, PRESENCE_LABEL,
  referencePeriod, SEASON_LABEL, TREND_LABEL,
} from '@/lib/labels';

type Profile = components['schemas']['SpeciesProfileDto'];
type Params = { params: Promise<{ slug: string }> };

const SECTIONS = [
  { id: 'what', title: 'What is it?' },
  { id: 'status', title: 'How threatened is it?' },
  { id: 'population', title: 'How many remain?' },
  { id: 'where', title: 'Where does it live?' },
  { id: 'diet', title: 'What does it eat?' },
  { id: 'threats', title: 'Why is it threatened?' },
  { id: 'help', title: 'How can I help?' },
  { id: 'sources', title: 'How do we know?' },
] as const;

async function load(slug: string): Promise<Profile> {
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)) notFound();
  try {
    // Cached until the API revalidates this tag on publish (PLAN §3 "Caching").
    return await apiGet('/api/v1/species/{slug}', { params: { slug }, tags: [`species:${slug}`] });
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) notFound();
    throw e;
  }
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const p = await load((await params).slug);
  const name = p.commonName ? `${p.commonName} (${p.scientificName})` : p.scientificName;
  return {
    title: name,
    description: p.overview?.slice(0, 160) ?? `Status, population, range and threats of ${p.scientificName}.`,
    alternates: { canonical: `/species/${p.slug}` },
  };
}

export default async function SpeciesPage({ params }: Params) {
  const p = await load((await params).slug);
  const index: SourceIndex = new Map(p.sources.map((s, i) => [s.id, { n: i + 1, title: s.title }]));
  const cited = (section: string) => p.citations.filter((c) => c.sectionKey === section).map((c) => c.sourceId);
  const headline = p.status.assessments.find((a) => a.scope === 'global') ?? p.status.assessments[0];
  const year = (d: string | null) => (d ? Number(d.slice(0, 4)) : undefined);

  return (
    <article className="mx-auto max-w-4xl px-4 pb-16">
      {/* ---------- header and key facts ---------- */}
      <header className="pt-8">
        <p className="text-sm font-medium uppercase tracking-wider text-forest-light">{GROUP_LABEL[p.displayGroup]}</p>
        <h1 className="mt-1 text-3xl font-semibold sm:text-4xl">{p.commonName ?? <i>{p.scientificName}</i>}</h1>
        {p.commonName ? <p className="mt-1 text-lg italic text-ink-muted">{p.scientificName}</p> : null}

        <div className="mt-6 flex aspect-[16/7] w-full items-center justify-center rounded-lg border border-line bg-paper-deep text-center text-sm text-ink-muted" role="img" aria-label="No photograph available">
          No licensed photograph yet
        </div>

        <dl className="mt-6 grid gap-4 rounded-lg border border-line bg-white/60 p-4 sm:grid-cols-3">
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-ink-muted">Status</dt>
            <dd className="mt-1">
              {headline ? (
                <StatusBadge category={headline.category} year={year(headline.assessedOn)} scope={headline.scope} size="sm" />
              ) : p.status.notAssessed ? (
                'Not assessed'
              ) : (
                'Unknown'
              )}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-ink-muted">Population</dt>
            <dd className="mt-1">
              {p.population.estimates.length
                ? `${p.population.estimates.length} dated estimate${p.population.estimates.length > 1 ? 's' : ''}`
                : 'Unknown'}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-ink-muted">Environment</dt>
            <dd className="mt-1">{p.geography.environments.map((e) => ENVIRONMENT_LABEL[e]).join(', ') || 'Unknown'}</dd>
          </div>
        </dl>
      </header>

      {/* ---------- in-page navigation (sticky on small screens) ---------- */}
      <nav aria-label="On this page" className="sticky top-0 z-10 -mx-4 mt-6 border-b border-line bg-paper/95 px-4 py-2 backdrop-blur md:static md:mx-0 md:border-0 md:bg-transparent md:px-0">
        <ul className="flex gap-x-4 gap-y-1 overflow-x-auto whitespace-nowrap text-sm md:flex-wrap md:overflow-visible">
          {SECTIONS.map((s) => (
            <li key={s.id}>
              <a href={`#${s.id}`} className="text-forest-light underline-offset-4 hover:underline">
                {s.title}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      {/* 1 ---------- What is it? ---------- */}
      <Section id="what" title="What is it?">
        {p.overview ? (
          <p className="leading-relaxed">
            {p.overview}
            <Cite ids={cited('overview')} index={index} />
          </p>
        ) : (
          <Missing>Not yet documented.</Missing>
        )}
        {p.commonNames.length > 1 || p.synonyms.length ? (
          <p className="mt-3 text-sm text-ink-muted">
            {p.commonNames.length > 1 ? <>Also called {p.commonNames.filter((n) => n.name !== p.commonName).map((n) => `${n.name} (${n.language})`).join(', ')}. </> : null}
            {p.synonyms.length ? <>Synonyms: {p.synonyms.map((n) => <i key={n.name}>{n.name}</i>).reduce<React.ReactNode[]>((a, x, i) => (i ? [...a, ', ', x] : [x]), [])}.</> : null}
          </p>
        ) : null}
        <details className="mt-4 rounded border border-line bg-white/50 p-3">
          <summary className="cursor-pointer font-medium">Classification and biology</summary>
          <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
            {(['kingdom', 'phylum', 'class', 'order', 'family', 'genus'] as const).map((rank) => (
              <div key={rank} className="contents">
                <dt className="capitalize text-ink-muted">{rank}</dt>
                <dd className={rank === 'genus' && p.taxonomy[rank] ? 'italic' : ''}>{p.taxonomy[rank] ?? 'Not recorded'}</dd>
              </div>
            ))}
            <dt className="text-ink-muted">Rank</dt>
            <dd className="capitalize">{p.rank}</dd>
          </dl>
          {p.biology.narrative ? <p className="mt-3 text-sm">{p.biology.narrative}<Cite ids={cited('biology')} index={index} /></p> : null}
          {p.biology.measurements.length ? (
            <ul className="mt-3 space-y-1 text-sm">
              {p.biology.measurements.map((m, i) => (
                <li key={i}>
                  {m.label}: {m.value ?? [m.min, m.max].filter((x) => x !== null).join('–')} {m.unit}
                  {m.context ? <span className="text-ink-muted"> ({m.context})</span> : null}
                  <Cite ids={cited('biology')} index={index} />
                </li>
              ))}
            </ul>
          ) : null}
        </details>
      </Section>

      {/* 2 ---------- How threatened is it? ---------- */}
      <Section id="status" title="How threatened is it?">
        {p.status.assessments.length ? (
          <ul className="space-y-3">
            {p.status.assessments.map((a, i) => (
              <li key={i} className="rounded border border-line bg-white/60 p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge category={a.category} year={year(a.assessedOn)} scope={a.scope} />
                  <Cite ids={[a.sourceId]} index={index} />
                </div>
                <p className="mt-2 text-sm text-ink-muted">
                  {a.scope === 'global' ? 'Global assessment' : `Regional assessment: ${a.region?.name ?? 'region not recorded'}`}
                  {' · '}
                  {TREND_LABEL[a.trend]}
                  {a.assessedOn ? ` · assessed ${formatDate(a.assessedOn)}` : ''}
                  {a.publishedOn ? ` · published ${formatDate(a.publishedOn)}` : ''}
                  {a.criteria ? ` · criteria ${a.criteria}` : ''}
                </p>
              </li>
            ))}
          </ul>
        ) : p.status.notAssessed ? (
          <Missing>Not assessed. No conservation assessment has been made for this species in our sources.</Missing>
        ) : (
          <Missing>Unknown.</Missing>
        )}
      </Section>

      {/* 3 ---------- How many remain? ---------- */}
      <Section id="population" title="How many remain?">
        {p.population.estimates.length ? (
          <>
            <ul className="space-y-3">
              {p.population.estimates.map((e, i) => {
                const value = estimateValue(e);
                const period = referencePeriod(e.referenceStart, e.referenceEnd);
                return (
                  <li key={i} className="rounded border border-line bg-white/60 p-3">
                    <p className="text-lg font-semibold">
                      {value ?? 'Unknown'}{' '}
                      {value && e.form !== 'qualitative' ? <span className="text-base font-normal">{BASIS_LABEL[e.basis]}</span> : null}
                      <Cite ids={[e.sourceId]} index={index} />
                    </p>
                    <p className="mt-1 text-sm text-ink-muted">
                      {e.context === 'wild' ? 'Wild' : 'Captive'}
                      {' · '}
                      {e.scope === 'global' ? 'Global' : (e.region?.name ?? 'Regional')}
                      {period ? ` · ${period}` : ' · date not stated'}
                      {e.method ? ` · ${e.method}` : ''}
                    </p>
                    {e.uncertaintyNote ? <p className="mt-1 text-sm">Uncertainty: {e.uncertaintyNote}</p> : null}
                  </li>
                );
              })}
            </ul>
            <p className="mt-3 text-sm text-ink-muted">
              Estimates with different units, places or dates are listed separately. They are never added together or compared as one number.
            </p>
          </>
        ) : (
          <div>
            <p className="text-lg font-semibold">Unknown</p>
            <p className="mt-1 text-ink-muted">
              {p.population.unknownNote ?? 'Our sources give no reliable population estimate for this species.'} Unknown does not mean zero.
            </p>
          </div>
        )}
      </Section>

      {/* 4 ---------- Where does it live? ---------- */}
      <Section id="where" title="Where does it live?">
        <h3 className="font-semibold">Countries, seas and oceans</h3>
        {p.geography.locationWithheld ? (
          <Missing>Locations are withheld to protect this species from collection or disturbance.</Missing>
        ) : p.geography.regions.length ? (
          <>
            <p className="text-sm text-ink-muted">Country-level presence. This is not a range map.</p>
            <ul className="mt-2 grid gap-2 sm:grid-cols-2">
              {p.geography.regions.map((r, i) => (
                <li key={i} className="rounded border border-line bg-white/60 px-3 py-2 text-sm">
                  <span className="font-medium">{r.region.name}</span>
                  <Cite ids={[r.sourceId]} index={index} />
                  <br />
                  <span className="text-ink-muted">
                    {PRESENCE_LABEL[r.presence]} · {ORIGIN_LABEL[r.origin]} · {SEASON_LABEL[r.seasonality]}
                  </span>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <Missing>Not yet documented.</Missing>
        )}

        <h3 className="mt-6 font-semibold">Habitats</h3>
        {p.geography.habitats.length ? (
          <ul className="mt-1 list-inside list-disc text-sm">
            {p.geography.habitats.map((h) => (
              <li key={h.code}>
                {h.name}
                {h.suitability ? ` (${h.suitability})` : ''}
                <Cite ids={[h.sourceId]} index={index} />
              </li>
            ))}
          </ul>
        ) : (
          <Missing>Not yet documented.</Missing>
        )}

        <h3 className="mt-6 font-semibold">Climate</h3>
        {p.geography.climate.narrative || p.geography.climate.ranges.length ? (
          <>
            {p.geography.climate.narrative ? <p className="text-sm">{p.geography.climate.narrative}<Cite ids={cited('climate')} index={index} /></p> : null}
            <ul className="mt-1 text-sm">
              {p.geography.climate.ranges.map((r, i) => (
                <li key={i}>
                  {r.label}: {[r.min, r.max].filter((x) => x !== null).join('–')} {r.unit} <span className="text-ink-muted">({r.context})</span>
                  <Cite ids={cited('climate')} index={index} />
                </li>
              ))}
            </ul>
          </>
        ) : (
          <Missing>Not yet documented.</Missing>
        )}
      </Section>

      {/* 5 ---------- What does it eat? ---------- */}
      <Section id="diet" title="What does it eat?">
        {p.diet.narrative || p.diet.tags.length ? (
          <>
            {p.diet.narrative ? <p>{p.diet.narrative}<Cite ids={cited('diet')} index={index} /></p> : null}
            {p.diet.context ? <p className="mt-2 text-sm text-ink-muted">{p.diet.context}</p> : null}
            {p.diet.tags.length ? (
              <ul className="mt-3 flex flex-wrap gap-2">
                {p.diet.tags.map((t) => (
                  <li key={t} className="rounded-full border border-line px-3 py-0.5 text-sm">{t}</li>
                ))}
              </ul>
            ) : null}
          </>
        ) : (
          <Missing>Not yet documented.</Missing>
        )}
      </Section>

      {/* 6 ---------- Why is it threatened? ---------- */}
      <Section id="threats" title="Why is it threatened?">
        {p.threats.threats.length ? (
          <ul className="list-inside list-disc">
            {p.threats.threats.map((t) => (
              <li key={t.code}>
                {t.name}
                {t.severity || t.timing ? <span className="text-ink-muted"> ({[t.severity, t.timing].filter(Boolean).join(', ')})</span> : null}
                <Cite ids={[t.sourceId]} index={index} />
              </li>
            ))}
          </ul>
        ) : (
          <Missing>No specific threats documented yet.</Missing>
        )}
        <h3 className="mt-6 font-semibold">Conservation actions</h3>
        {p.threats.conservationActions ? (
          <p>{p.threats.conservationActions}<Cite ids={cited('actions')} index={index} /></p>
        ) : (
          <Missing>Not yet documented.</Missing>
        )}
      </Section>

      {/* 7 ---------- How can I help? ---------- */}
      <Section id="help" title="How can I help?">
        {p.support.length ? (
          <ul className="space-y-3">
            {p.support.map((l, i) => (
              <li key={i} className="rounded border border-line bg-white/60 p-3">
                <a href={l.url} rel="noopener noreferrer" className="font-medium text-forest-light underline underline-offset-4">
                  {ACTION_LABEL[l.actionType]}: {l.organizationName}
                </a>
                <span className="ml-2 text-sm text-ink-muted">(goes to {l.domain})</span>
                <p className="mt-1 text-sm">{l.description}</p>
                {l.contextNote ? <p className="mt-1 text-sm text-ink-muted">{l.contextNote}</p> : null}
              </li>
            ))}
          </ul>
        ) : (
          <Missing>No reviewed support links for this species yet.</Missing>
        )}
        <p className="mt-3 text-sm text-ink-muted">
          Links go to independent organizations. Our review does not certify how effective an organization is, and a click is not a donation.
        </p>
      </Section>

      {/* 8 ---------- How do we know? ---------- */}
      <Section id="sources" title="How do we know?">
        {p.sources.length ? (
          <ol className="space-y-2 text-sm">
            {p.sources.map((s, i) => (
              <li key={s.id} id={`source-${i + 1}`} className="scroll-mt-16">
                <span className="font-medium">[{i + 1}]</span>{' '}
                {s.authors ? `${s.authors}. ` : ''}
                {s.url ? (
                  <a href={s.url} rel="noopener noreferrer" className="text-forest-light underline underline-offset-2">{s.title}</a>
                ) : (
                  s.title
                )}
                {s.publisher ? `. ${s.publisher}` : ''}
                {s.publishedOn ? `, ${s.publishedOn.slice(0, 4)}` : ''}.
                {s.doi ? <> DOI {s.doi}.</> : null}
                {s.accessedOn ? <span className="text-ink-muted"> Accessed {formatDate(s.accessedOn)}.</span> : null}
                {s.license ? <span className="text-ink-muted"> Licence: {s.license}.</span> : null}
              </li>
            ))}
          </ol>
        ) : (
          <Missing>No sources recorded.</Missing>
        )}
        {p.media.length ? (
          <>
            <h3 className="mt-6 font-semibold">Photographs</h3>
            <ul className="mt-1 text-sm">
              {p.media.map((m) => (
                <li key={m.storageKey}>
                  {m.credit}, {m.license}
                  {m.sourceUrl ? <> (<a href={m.sourceUrl} rel="noopener noreferrer" className="underline">source</a>)</> : null}
                </li>
              ))}
            </ul>
          </>
        ) : null}
        <p className="mt-6 text-sm text-ink-muted">
          Version {p.review.version}, reviewed {formatDate(p.review.reviewedAt)}
          {p.review.reviewerRole ? ` by an ${p.review.reviewerRole === 'admin' ? 'administrator' : 'editor'}` : ''}
          {p.review.selfReviewed ? ' (self-reviewed: the author published their own edit, with no independent review)' : ''}.
        </p>
      </Section>
    </article>
  );
}

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-h`} className="mt-10 scroll-mt-16">
      <h2 id={`${id}-h`} className="mb-3 text-2xl font-semibold">
        {title}
      </h2>
      {children}
    </section>
  );
}
