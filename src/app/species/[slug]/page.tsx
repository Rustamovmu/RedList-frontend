import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { AddToCompare } from '@/components/compare/AddToCompare';
import { ProfileMap } from '@/components/map/ProfileMap';
import { Photo } from '@/components/Photo';
import { Cite, Missing, type SourceIndex } from '@/components/profile/Cite';
import { SpeciesCard } from '@/components/SpeciesCard';
import { SectionHead } from '@/components/SectionHead';
import { STATUS_EDGE, StatusBadge } from '@/components/StatusBadge';
import type { components } from '@/contracts/api';
import { ApiError, apiGet } from '@/lib/api';
import { mediaSrc } from '@/lib/media';
import { absolute, jsonLd } from '@/lib/site';
import {
  ACTION_LABEL, BASIS_LABEL, ENVIRONMENT_LABEL, estimateValue, formatDate, GROUP_PLURAL, headlineEstimate, ORIGIN_LABEL, PRESENCE_LABEL,
  referencePeriod, SEASON_LABEL, TREND_LABEL,
} from '@/lib/labels';

type Profile = components['schemas']['SpeciesProfileDto'];
type Estimate = components['schemas']['EstimateDto'];
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
    return await apiGet('/api/v1/species/{slug}', { params: { slug }, tags: [`species:${slug}`, 'catalogue'] });
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) notFound();
    throw e;
  }
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const p = await load((await params).slug);
  const name = p.commonName ? `${p.commonName} (${p.scientificName})` : p.scientificName;
  const description = summary(p.overview) ?? `Status, population, range and threats of ${p.scientificName}.`;
  const photo = primaryPhoto(p);
  // Open Graph uses the licensed catalogue photo itself (served by our API), never a stock or generated image.
  const images = photo
    ? [{ url: absolute(`${mediaSrc(photo.storageKey)}/1280.webp`), width: Math.min(photo.width, 1280), height: Math.round((Math.min(photo.width, 1280) * photo.height) / photo.width), alt: photo.altText }]
    : undefined;
  return {
    title: name,
    description,
    alternates: { canonical: `/species/${p.slug}` },
    openGraph: { type: 'article', title: name, description, url: `/species/${p.slug}`, images },
    twitter: { card: photo ? 'summary_large_image' : 'summary', title: name, description, images: images?.map((i) => i.url) },
  };
}

/** First sentences of the overview, cut at a word boundary, at most 160 characters. */
function summary(text: string | null): string | null {
  if (!text) return null;
  if (text.length <= 160) return text;
  const cut = text.slice(0, 157);
  return `${cut.slice(0, cut.lastIndexOf(' '))}…`;
}

const primaryPhoto = (p: Profile) => p.media.find((m) => m.role === 'primary') ?? p.media[0];

/** schema.org structured data: the species as a Taxon, and a breadcrumb trail. Built only from the published profile. */
function structuredData(p: Profile) {
  const url = absolute(`/species/${p.slug}`);
  const photo = primaryPhoto(p);
  return [
    {
      '@context': 'https://schema.org',
      '@type': 'Taxon',
      name: p.scientificName,
      taxonRank: p.rank,
      url,
      ...(p.commonName || p.commonNames.length || p.synonyms.length
        ? { alternateName: [...new Set([p.commonName, ...p.commonNames.map((n) => n.name), ...p.synonyms.map((n) => n.name)].filter(Boolean))] }
        : {}),
      ...(p.taxonomy.genus ? { parentTaxon: { '@type': 'Taxon', name: p.taxonomy.genus, taxonRank: 'genus' } } : {}),
      ...(photo ? { image: absolute(`${mediaSrc(photo.storageKey)}/1280.webp`) } : {}),
      ...(p.overview ? { description: summary(p.overview) } : {}),
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Explore', item: absolute('/species') },
        { '@type': 'ListItem', position: 2, name: p.commonName ?? p.scientificName, item: url },
      ],
    },
  ];
}

export default async function SpeciesPage({ params }: Params) {
  const p = await load((await params).slug);
  const index: SourceIndex = new Map(p.sources.map((s, i) => [s.id, { n: i + 1, title: s.title }]));
  const cited = (section: string) => p.citations.filter((c) => c.sectionKey === section).map((c) => c.sourceId);
  const headline = p.status.assessments.find((a) => a.scope === 'global') ?? p.status.assessments[0];
  const year = (d: string | null) => (d ? Number(d.slice(0, 4)) : undefined);
  const photo = primaryPhoto(p);
  const environments = p.geography.environments.map((e) => ENVIRONMENT_LABEL[e]).join(', ');
  const populationLead = headlineEstimate(p.population.estimates);

  return (
    <article className={p.related.length ? 'flush-bottom' : undefined}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(structuredData(p)) }} />
      {/* ---------- title, photo and key facts ----------
          Stacked on small screens (title, photo, facts). From lg the title and facts sit beside the photo, so the
          name and the whole, uncropped photo are both in the first screen (.profile-hero sets the photo's height cap). */}
      <header className="profile-hero wrap pt-8 md:pt-10">
        <div className="grid grid-cols-[minmax(0,1fr)] gap-y-6 md:gap-y-8 [grid-template-areas:'title''photo''facts'] lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:grid-rows-[auto_1fr] lg:gap-x-12 lg:[grid-template-areas:'title_photo''facts_photo'] xl:gap-x-16">
          <div className="min-w-0 [grid-area:title]">
            <nav aria-label="Breadcrumb">
              <ol className="flex flex-wrap items-center gap-x-2 text-sm font-medium text-muted">
                <li>
                  <Link href="/species" className="inline-flex min-h-6 items-center text-fog underline-offset-4 hover:text-lime hover:underline">Explore</Link>
                </li>
                <li aria-hidden>/</li>
                <li>
                  <Link href={`/species?group=${p.displayGroup}`} className="inline-flex min-h-6 items-center text-fog underline-offset-4 hover:text-lime hover:underline">
                    {GROUP_PLURAL[p.displayGroup]}
                  </Link>
                </li>
              </ol>
            </nav>
            {p.commonName ? (
              <>
                <h1 className="h-page mt-5 max-w-[16ch] text-[clamp(2.75rem,8vw,4.75rem)] lg:text-[clamp(3rem,4.8vw,5.25rem)]">{p.commonName}</h1>
                <p className="mt-4 text-2xl font-medium italic tracking-[-0.01em] text-lime sm:text-[1.875rem]">{p.scientificName}</p>
              </>
            ) : (
              <h1 className="mt-5 text-[clamp(2rem,5vw,3.25rem)] font-bold italic leading-tight tracking-[-0.02em] text-white">{p.scientificName}</h1>
            )}
            <div className="mt-8">
              <AddToCompare slug={p.slug} name={p.commonName ?? p.scientificName} />
            </div>
          </div>

          <div className="min-w-0 [grid-area:photo]">
            {photo ? (
              <Photo
                storageKey={photo.storageKey} altText={photo.altText} caption={photo.caption} sizes="(min-width: 1024px) 760px, 100vw" priority
                fit={{ width: photo.width, height: photo.height }} className="lg:ml-auto"
              />
            ) : (
              <div className="grid-bg flex aspect-[4/3] max-h-[var(--photo-max-h)] w-full items-center justify-center border border-rule text-center text-xs font-semibold uppercase tracking-[0.12em] text-muted sm:aspect-[21/9] sm:text-sm lg:aspect-[4/3]" role="img" aria-label="No photograph available">
                No licensed photograph yet
              </div>
            )}
          </div>

          <dl className="grid self-end border border-rule bg-panel [grid-area:facts] sm:grid-cols-3 lg:grid-cols-1">
            <div className="p-5 lg:flex lg:items-center lg:justify-between lg:gap-6 lg:py-4">
              <dt className="label">Status</dt>
              <dd className="mt-2 lg:mt-0 lg:text-right">
                {headline ? (
                  <StatusBadge category={headline.category} year={year(headline.assessedOn)} scope={headline.scope} />
                ) : (
                  <span className="font-semibold text-white">{p.status.notAssessed ? 'Not assessed' : 'Unknown'}</span>
                )}
              </dd>
            </div>
            <div className="border-t border-rule p-5 sm:border-t-0 sm:border-l lg:flex lg:items-baseline lg:justify-between lg:gap-6 lg:border-t lg:border-l-0 lg:py-4">
              <dt className="label">Population</dt>
              <dd className="mt-2 lg:mt-0 lg:text-right" data-testid="population-fact">
                {populationLead ? (
                  <PopulationFact e={populationLead} more={p.population.estimates.length - 1} />
                ) : (
                  <span className="font-semibold text-white">Unknown</span>
                )}
              </dd>
            </div>
            <div className="border-t border-rule p-5 sm:border-t-0 sm:border-l lg:flex lg:items-center lg:justify-between lg:gap-6 lg:border-t lg:border-l-0 lg:py-4">
              <dt className="label">Environment</dt>
              <dd className="mt-2 font-semibold text-white lg:mt-0 lg:text-right">{environments || 'Unknown'}</dd>
            </div>
          </dl>
        </div>
      </header>

      <div className="wrap mt-10 grid grid-cols-[minmax(0,1fr)] gap-x-16 md:mt-20 md:grid-cols-[13rem_minmax(0,1fr)] lg:grid-cols-[16rem_minmax(0,1fr)] xl:gap-x-24">
        {/* ---------- in-page navigation: a sticky side list, or a sticky scrolling bar on small screens ---------- */}
        <nav aria-label="On this page" className="sticky top-[var(--nav-h)] z-20 -mx-5 border-y border-rule bg-black px-5 md:top-[calc(var(--nav-h)+2rem)] md:mx-0 md:self-start md:border-0 md:bg-transparent md:px-0">
          <ol className="flex gap-x-5 overflow-x-auto whitespace-nowrap md:block md:space-y-0 md:whitespace-normal">
            {SECTIONS.map((s, i) => (
              <li key={s.id} className="md:border-b md:border-rule">
                <a href={`#${s.id}`} className="flex min-h-11 items-center gap-3 text-sm font-medium text-fog hover:text-lime md:py-2">
                  <span className="figures text-xs font-bold text-lime">{String(i + 1).padStart(2, '0')}</span>
                  {s.title}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        <div className="min-w-0 space-y-24 pt-12 md:pt-0">
          {/* 1 ---------- What is it? ---------- */}
          <Section n={1} id="what" title="What is it?">
            {p.overview ? (
              <p className="prose-measure text-lg leading-relaxed text-fog">
                {p.overview}
                <Cite ids={cited('overview')} index={index} />
              </p>
            ) : (
              <Missing>Not yet documented.</Missing>
            )}
            {p.commonNames.length > 1 || p.synonyms.length ? (
              <p className="prose-measure mt-4 text-[0.9375rem] text-muted">
                {p.commonNames.length > 1 ? <>Also called {p.commonNames.filter((n) => n.name !== p.commonName).map((n) => `${n.name} (${n.language})`).join(', ')}. </> : null}
                {p.synonyms.length ? <>Synonyms: {p.synonyms.map((n) => <i key={n.name}>{n.name}</i>).reduce<React.ReactNode[]>((a, x, i) => (i ? [...a, ', ', x] : [x]), [])}.</> : null}
              </p>
            ) : null}
            <details className="disclosure mt-8 border border-rule bg-panel">
              <summary className="flex min-h-14 items-center px-5 text-base font-bold text-white">Classification and biology</summary>
              <div className="border-t border-rule px-5 pt-4 pb-6">
                <dl className="grid grid-cols-[auto_1fr] gap-x-10 text-[0.9375rem]">
                  {(['kingdom', 'phylum', 'class', 'order', 'family', 'genus'] as const).map((rank) => (
                    <div key={rank} className="contents">
                      <dt className="border-b border-rule py-2 text-sm font-medium capitalize text-muted">{rank}</dt>
                      <dd className={`border-b border-rule py-2 text-white ${rank === 'genus' && p.taxonomy[rank] ? 'italic' : ''}`}>{p.taxonomy[rank] ?? 'Not recorded'}</dd>
                    </div>
                  ))}
                  <dt className="py-2 text-sm font-medium text-muted">Rank</dt>
                  <dd className="py-2 capitalize text-white">{p.rank}</dd>
                </dl>
                {p.biology.narrative ? <p className="prose-measure mt-4 text-[0.9375rem]">{p.biology.narrative}<Cite ids={cited('biology')} index={index} /></p> : null}
                {p.biology.measurements.length ? (
                  <ul className="mt-4 space-y-1 text-[0.9375rem]">
                    {p.biology.measurements.map((m, i) => (
                      <li key={i}>
                        {m.label}: {m.value ?? [m.min, m.max].filter((x) => x !== null).join('–')} {m.unit}
                        {m.context ? <span className="text-muted"> ({m.context})</span> : null}
                        <Cite ids={cited('biology')} index={index} />
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            </details>
          </Section>

          {/* 2 ---------- How threatened is it? ---------- */}
          <Section n={2} id="status" title="How threatened is it?">
            {p.status.assessments.length ? (
              <ul className="space-y-3">
                {p.status.assessments.map((a, i) => (
                  <li key={i} className={`border border-l-4 border-rule bg-panel px-5 py-4 ${STATUS_EDGE[a.category]}`}>
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusBadge category={a.category} year={year(a.assessedOn)} scope={a.scope} />
                      <Cite ids={[a.sourceId]} index={index} />
                    </div>
                    <p className="meta mt-3">
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
          <Section n={3} id="population" title="How many remain?">
            {p.population.estimates.length ? (
              <>
                <ul className="grid gap-4 xl:grid-cols-2">
                  {p.population.estimates.map((e, i) => {
                    const value = estimateValue(e);
                    const period = referencePeriod(e.referenceStart, e.referenceEnd);
                    const words = e.form === 'qualitative';
                    return (
                      <li key={i} className="panel flex flex-col px-6 py-6">
                        <p className="flex flex-wrap items-baseline gap-x-3 gap-y-2">
                          {value === null ? (
                            <span className="text-4xl font-bold leading-none tracking-[-0.03em] text-muted">Unknown</span>
                          ) : words ? (
                            <span className="text-xl font-medium leading-snug text-white">{value}</span>
                          ) : (
                            <span className="figures text-[clamp(2.25rem,4vw,3.25rem)] font-bold leading-none tracking-[-0.03em] text-lime">{value}</span>
                          )}
                          {value && !words ? <span className="text-[0.9375rem] font-medium text-fog">{BASIS_LABEL[e.basis]}</span> : null}
                          <Cite ids={[e.sourceId]} index={index} />
                        </p>
                        <p className="mt-5 flex flex-wrap gap-2" aria-label="Context of this estimate">
                          <span className="chip">{e.context === 'wild' ? 'Wild' : 'Captive'}</span>
                          <span className="chip">{e.scope === 'global' ? 'Global' : (e.region?.name ?? 'Regional')}</span>
                          <span className="chip">{period ?? 'date not stated'}</span>
                          {e.method ? <span className="chip">{e.method}</span> : null}
                        </p>
                        {e.uncertaintyNote ? <p className="mt-4 text-[0.9375rem] text-fog">Uncertainty: {e.uncertaintyNote}</p> : null}
                      </li>
                    );
                  })}
                </ul>
                <p className="notice prose-measure mt-6 text-[0.9375rem] text-fog">
                  Estimates with different units, places or dates are listed separately. They are never added together or compared as one number.
                </p>
              </>
            ) : (
              <div>
                <p className="text-[clamp(2.5rem,6vw,4rem)] font-bold leading-none tracking-[-0.03em] text-muted">Unknown</p>
                <p className="prose-measure mt-4 text-fog">
                  {p.population.unknownNote ?? 'Our sources give no reliable population estimate for this species.'} Unknown does not mean zero.
                </p>
              </div>
            )}
          </Section>

          {/* 4 ---------- Where does it live? ---------- */}
          <Section n={4} id="where" title="Where does it live?">
            {p.geography.locationWithheld ? (
              <p className="notice prose-measure text-fog">Locations are withheld to protect this species from collection or disturbance.</p>
            ) : (
              <>
                {p.geography.regions.length || p.geography.ranges.length ? <ProfileMap slug={p.slug} name={p.commonName ?? p.scientificName} /> : null}
                {p.geography.locationGeneralized ? (
                  <p className="notice prose-measure mb-6 text-[0.9375rem] text-fog">
                    <strong className="text-white">Generalized to whole countries or seas</strong> to protect this species. Its precise locations are not published.
                  </p>
                ) : null}

                <SubHead>Range maps</SubHead>
                {p.geography.ranges.length ? (
                  <ul className="mt-3 space-y-2 text-[0.9375rem]">
                    {p.geography.ranges.map((r, i) => (
                      <li key={i}>
                        Published range map: {PRESENCE_LABEL[r.presence]} · {SEASON_LABEL[r.seasonality]}
                        {r.datasetVersion ? <> · dataset {r.datasetVersion}</> : null}
                        <Cite ids={[r.sourceId]} index={index} />
                        {r.generalizationNote ? <span className="block text-muted">{r.generalizationNote}</span> : null}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="mt-3"><Missing>No published range map. Only country-level presence is shown; we never draw a range a source has not published.</Missing></div>
                )}

                <SubHead>Countries, seas and oceans</SubHead>
                {p.geography.regions.length ? (
                  <>
                    <p className="mt-2 text-[0.9375rem] text-muted">Country-level presence: the species is recorded somewhere in each place, not everywhere in it.</p>
                    <ul className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                      {p.geography.regions.map((r, i) => (
                        <li key={i} className="panel px-4 py-3">
                          <Link href={`/regions/${r.region.slug}`} className="inline-flex min-h-6 items-center font-semibold text-lime underline-offset-4 hover:underline">{r.region.name}</Link>
                          <Cite ids={[r.sourceId]} index={index} />
                          <span className="mt-1 block text-[0.8125rem] text-muted">
                            {PRESENCE_LABEL[r.presence]} · {ORIGIN_LABEL[r.origin]} · {SEASON_LABEL[r.seasonality]}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </>
                ) : (
                  <div className="mt-3"><Missing>Not yet documented.</Missing></div>
                )}
              </>
            )}

            <SubHead>Habitats</SubHead>
            {p.geography.habitats.length ? (
              <ul className="mt-3 flex flex-wrap gap-2">
                {p.geography.habitats.map((h) => (
                  <li key={h.code} className="chip">
                    {h.name}
                    {h.suitability ? ` (${h.suitability})` : ''}
                    <Cite ids={[h.sourceId]} index={index} />
                  </li>
                ))}
              </ul>
            ) : (
              <div className="mt-3"><Missing>Not yet documented.</Missing></div>
            )}

            <SubHead>Climate</SubHead>
            {p.geography.climate.narrative || p.geography.climate.ranges.length ? (
              <>
                {p.geography.climate.narrative ? <p className="prose-measure mt-3">{p.geography.climate.narrative}<Cite ids={cited('climate')} index={index} /></p> : null}
                <ul className="mt-2 text-[0.9375rem]">
                  {p.geography.climate.ranges.map((r, i) => (
                    <li key={i}>
                      {r.label}: {[r.min, r.max].filter((x) => x !== null).join('–')} {r.unit} <span className="text-muted">({r.context})</span>
                      <Cite ids={cited('climate')} index={index} />
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <div className="mt-3"><Missing>Not yet documented.</Missing></div>
            )}
          </Section>

          {/* 5 ---------- What does it eat? ---------- */}
          <Section n={5} id="diet" title="What does it eat?">
            {p.diet.narrative || p.diet.tags.length ? (
              <>
                {p.diet.narrative ? <p className="prose-measure text-lg leading-relaxed">{p.diet.narrative}<Cite ids={cited('diet')} index={index} /></p> : null}
                {p.diet.context ? <p className="prose-measure mt-3 text-[0.9375rem] text-muted">{p.diet.context}</p> : null}
                {p.diet.tags.length ? (
                  <ul className="mt-5 flex flex-wrap gap-2">
                    {p.diet.tags.map((t) => (
                      <li key={t} className="chip">{t}</li>
                    ))}
                  </ul>
                ) : null}
              </>
            ) : (
              <Missing>Not yet documented.</Missing>
            )}
          </Section>

          {/* 6 ---------- Why is it threatened? ---------- */}
          <Section n={6} id="threats" title="Why is it threatened?">
            {p.threats.threats.length ? (
              <ul className="border-t border-rule">
                {p.threats.threats.map((t) => (
                  <li key={t.code} className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 border-b border-rule py-3">
                    <span className="text-white">
                      {t.name}
                      <Cite ids={[t.sourceId]} index={index} />
                    </span>
                    {t.severity || t.timing ? <span className="text-[0.8125rem] text-muted">({[t.severity, t.timing].filter(Boolean).join(', ')})</span> : null}
                  </li>
                ))}
              </ul>
            ) : (
              <Missing>No specific threats documented yet.</Missing>
            )}
            <SubHead>Conservation actions</SubHead>
            {p.threats.conservationActions ? (
              <p className="prose-measure mt-3">{p.threats.conservationActions}<Cite ids={cited('actions')} index={index} /></p>
            ) : (
              <div className="mt-3"><Missing>Not yet documented.</Missing></div>
            )}
          </Section>

          {/* 7 ---------- How can I help? ---------- */}
          <Section n={7} id="help" title="How can I help?">
            {p.support.length ? (
              <ul className="grid gap-4 xl:grid-cols-2">
                {p.support.map((l, i) => (
                  <li key={i} className="panel px-6 py-5">
                    <p className="kicker">{ACTION_LABEL[l.actionType]}</p>
                    <a href={l.url} rel="noopener noreferrer" className="mt-2 inline-block text-lg font-semibold text-lime underline decoration-1 underline-offset-4 hover:decoration-2">
                      {ACTION_LABEL[l.actionType]}: {l.organizationName}<span aria-hidden> ↗</span>
                    </a>
                    <span className="mt-1 block text-[0.8125rem] text-muted">(goes to {l.domain})</span>
                    <p className="mt-3 text-[0.9375rem]">{l.description}</p>
                    {l.contextNote ? <p className="mt-2 text-[0.9375rem] text-muted">{l.contextNote}</p> : null}
                  </li>
                ))}
              </ul>
            ) : (
              <Missing>No reviewed support links for this species yet.</Missing>
            )}
            <p className="prose-measure mt-5 text-[0.9375rem] text-muted">
              Links go to independent organizations. Our review does not certify how effective an organization is, and a click is not a donation.{' '}
              <Link href="/support" className="link">See the support directory and how we review links</Link>.
            </p>
          </Section>

          {/* 8 ---------- How do we know? ---------- */}
          <Section n={8} id="sources" title="How do we know?">
            {p.sources.length ? (
              <ol className="border-t border-rule">
                {p.sources.map((s, i) => (
                  <li key={s.id} id={`source-${i + 1}`} className="grid scroll-mt-24 grid-cols-[3rem_1fr] gap-x-3 border-b border-rule py-4 text-[0.9375rem]">
                    <span className="figures text-sm font-bold text-lime">[{i + 1}]</span>
                    <span>
                      {s.authors ? `${s.authors}. ` : ''}
                      {s.url ? (
                        <a href={s.url} rel="noopener noreferrer" className="link">{s.title}</a>
                      ) : (
                        <span className="text-white">{s.title}</span>
                      )}
                      {s.publisher ? `. ${s.publisher}` : ''}
                      {s.publishedOn ? `, ${s.publishedOn.slice(0, 4)}` : ''}.
                      {s.doi ? <> DOI {s.doi}.</> : null}
                      {s.accessedOn ? <span className="text-muted"> Accessed {formatDate(s.accessedOn)}.</span> : null}
                      {s.license ? <span className="text-muted"> Licence: {s.license}.</span> : null}
                    </span>
                  </li>
                ))}
              </ol>
            ) : (
              <Missing>No sources recorded.</Missing>
            )}
            {p.media.length ? (
              <>
                <SubHead>Photographs</SubHead>
                <ul className="mt-3 space-y-1 text-[0.9375rem]">
                  {p.media.map((m) => (
                    <li key={m.storageKey}>
                      {m.credit}
                      {m.credit.toLowerCase().includes(m.license.toLowerCase()) ? '' : `, ${m.license}`}
                      {m.sourceUrl ? <> (<a href={m.sourceUrl} rel="noopener noreferrer" className="link">source</a>)</> : null}
                    </li>
                  ))}
                </ul>
              </>
            ) : null}
            <p className="panel mt-8 px-5 py-4 text-[0.9375rem] text-fog">
              Version {p.review.version}, reviewed {formatDate(p.review.reviewedAt)}
              {p.review.reviewerRole ? ` by an ${p.review.reviewerRole === 'admin' ? 'administrator' : 'editor'}` : ''}
              {p.review.selfReviewed ? ' (self-reviewed: the author published their own edit, with no independent review)' : ''}.
            </p>
          </Section>
        </div>
      </div>

      {p.related.length ? (
        <section aria-labelledby="related-h" className="mt-28 border-t border-rule bg-panel">
          <div className="wrap py-20 lg:py-24">
            <SectionHead id="related-h" title="Related species" />
            <p className="mt-4 text-muted">Chosen because they share an animal group, threats or places.</p>
            <ul className="mt-10 grid gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-4">
              {p.related.map((c) => (
                <li key={c.slug}>
                  <SpeciesCard card={c} />
                </li>
              ))}
            </ul>
          </div>
        </section>
      ) : null}
    </article>
  );
}

function Section({ n, id, title, children }: { n: number; id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-h`} className="scroll-mt-20 md:scroll-mt-8">
      <SectionHead id={`${id}-h`} n={String(n).padStart(2, '0')} title={title} rule />
      <div className="mt-8">{children}</div>
    </section>
  );
}

/**
 * The population key fact (D-059): one listed estimate with its own basis, wild or captive, place and year, so a figure
 * never stands alone (PLAN §5). With more estimates, a link to the full list in "How many remain?".
 */
function PopulationFact({ e, more }: { e: Estimate; more: number }) {
  const value = estimateValue(e);
  return (
    <>
      <span className="block font-semibold text-white">
        {value === null ? (
          'Unknown'
        ) : e.form === 'qualitative' ? (
          value
        ) : (
          <>
            <span className="figures">{value}</span> <span className="font-medium text-fog">{BASIS_LABEL[e.basis]}</span>
          </>
        )}
      </span>
      <span className="mt-0.5 block text-[0.8125rem] font-medium text-muted">
        {e.context === 'wild' ? 'Wild' : 'Captive'} · {e.scope === 'global' ? 'Global' : (e.region?.name ?? 'Regional')} ·{' '}
        {referencePeriod(e.referenceStart, e.referenceEnd) ?? 'date not stated'}
      </span>
      {more > 0 ? (
        <a href="#population" className="mt-1 inline-flex min-h-6 items-center text-[0.8125rem] font-semibold text-lime underline underline-offset-4 hover:decoration-2">
          and {more} more estimate{more > 1 ? 's' : ''}
        </a>
      ) : null}
    </>
  );
}

function SubHead({ children }: { children: React.ReactNode }) {
  return <h3 className="mt-12 text-lg font-bold text-white first:mt-0">{children}</h3>;
}
