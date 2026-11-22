'use client';

import { ENVIRONMENT_LABEL, GROUP_LABEL } from '@/lib/labels';
import type { S } from '@/lib/staff-api';
import { CheckboxRow, FormSection, NumberInput, RowList, TagInput, TextArea, TextInput } from './fields';
import { PhotoPicker } from './PhotoPicker';

type Content = S['RevisionContentDto'];
type Editorial = Content['editorial'];
type Name = Content['names'][number];
type Environment = Content['environments'][number];
type ClimateRange = NonNullable<NonNullable<Editorial['climate']>['ranges']>[number];
type Measurement = NonNullable<Editorial['measurements']>[number];

const ENVIRONMENTS: Environment[] = ['terrestrial', 'freshwater', 'marine', 'brackish', 'subterranean', 'aerial'];
const GROUPS = Object.keys(GROUP_LABEL) as Content['displayGroup'][];
const TAXONOMY: Array<[keyof NonNullable<Editorial['taxonomy']>, string]> = [
  ['kingdom', 'Kingdom'], ['phylum', 'Phylum'], ['class', 'Class'], ['order', 'Order'], ['family', 'Family'], ['genus', 'Genus'],
];

/**
 * Form editor for the parts of a revision that are plain editorial content: the photos, names, grouping,
 * the written sections, diet tags and the typical-conditions and measurement numbers (PLAN §7 "Editor UI").
 * The scientific rows that each need a source — assessments, population estimates, places, habitats,
 * threats, citations and support links — are still edited as JSON on the same page (DECISIONS D-011, D-057),
 * so this form never touches them: it only ever replaces the keys it owns.
 */
export function ContentForm({
  content, media, onChange, disabled,
}: {
  content: Content;
  media: S['StaffMediaDto'][];
  onChange: (c: Content) => void;
  disabled?: boolean;
}) {
  const ed = content.editorial;
  const set = (patch: Partial<Content>) => onChange({ ...content, ...patch });
  const setEd = (patch: Partial<Editorial>) => onChange({ ...content, editorial: { ...ed, ...patch } });

  const hasAssessments = content.assessments.length > 0;
  const hasEstimates = content.populationEstimates.length > 0;

  return (
    <div className="grid gap-5">
      <FormSection title="Photos" hint="The first photo is the one visitors see on cards and at the top of the profile.">
        <PhotoPicker photos={content.media} media={media} onChange={(v) => set({ media: v })} disabled={disabled} />
      </FormSection>

      <FormSection title="Names and grouping">
        <label className="block">
          <span className="text-sm font-medium">Animal group<span className="text-lime"> *</span></span>
          <select value={content.displayGroup} onChange={(e) => set({ displayGroup: e.target.value as Content['displayGroup'] })} disabled={disabled} className="field mt-1">
            {GROUPS.map((g) => (
              <option key={g} value={g}>{GROUP_LABEL[g]}</option>
            ))}
          </select>
        </label>

        <fieldset>
          <legend className="text-sm font-medium">Environments <span className="text-muted">(optional, more than one is fine)</span></legend>
          <p className="mt-0.5 text-[0.8125rem] text-muted">A whale is both a mammal and marine: group and environment are separate.</p>
          <div className="mt-2 flex flex-wrap gap-x-5 gap-y-2">
            {ENVIRONMENTS.map((envValue) => (
              <label key={envValue} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={content.environments.includes(envValue)}
                  disabled={disabled}
                  onChange={(e) =>
                    set({ environments: e.target.checked ? [...content.environments, envValue] : content.environments.filter((x) => x !== envValue) })
                  }
                  className="size-4 accent-lime"
                />
                {ENVIRONMENT_LABEL[envValue]}
              </label>
            ))}
          </div>
        </fieldset>

        <RowList<Name>
          legend="Common names and synonyms"
          hint="Language-tagged, because a common name is never a way to identify a species. Mark one preferred name per language."
          rows={content.names}
          onChange={(v) => set({ names: v })}
          blank={() => ({ language: 'en', name: '', nameType: 'common', preferred: false })}
          disabled={disabled}
          addLabel="Add a name"
          max={100}
          render={(row, patch) => (
            <>
              <label className="block text-sm">
                Name
                <input value={row.name} onChange={(e) => patch({ name: e.target.value })} disabled={disabled} maxLength={200} className="field mt-1 py-1.5 text-sm" />
              </label>
              <label className="block text-sm">
                Language code
                <input value={row.language} onChange={(e) => patch({ language: e.target.value })} disabled={disabled} placeholder="en" className="field mt-1 py-1.5 text-sm" />
              </label>
              <label className="block text-sm">
                Kind
                <select value={row.nameType} onChange={(e) => patch({ nameType: e.target.value as Name['nameType'] })} disabled={disabled} className="field mt-1 py-1.5 text-sm">
                  <option value="common">Common name</option>
                  <option value="synonym">Synonym</option>
                </select>
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={row.preferred} onChange={(e) => patch({ preferred: e.target.checked })} disabled={disabled} className="size-4 accent-lime" />
                Preferred in this language
              </label>
            </>
          )}
        />
      </FormSection>

      <FormSection title="What is it?">
        <TextArea
          label="Overview"
          required
          hint="In our own words, not copied from a source. A citation for it is required to publish."
          value={ed.overview ?? ''}
          onChange={(v) => setEd({ overview: v })}
          rows={6}
          maxLength={4000}
          disabled={disabled}
        />
        <fieldset>
          <legend className="text-sm font-medium">Classification <span className="text-muted">(optional)</span></legend>
          <div className="mt-2 grid gap-3 sm:grid-cols-3">
            {TAXONOMY.map(([key, label]) => (
              <label key={key} className="block text-sm">
                {label}
                <input
                  value={ed.taxonomy?.[key] ?? ''}
                  onChange={(e) => setEd({ taxonomy: { ...ed.taxonomy, [key]: e.target.value } })}
                  disabled={disabled}
                  maxLength={80}
                  className="field mt-1 py-1.5 text-sm"
                />
              </label>
            ))}
          </div>
        </fieldset>
      </FormSection>

      <FormSection
        title="Status and population"
        hint="The assessment and the estimates themselves are edited as JSON below, because each row needs a source. These two switches are the explicit “we have nothing” statements the checklist asks for."
      >
        <CheckboxRow
          label="Not assessed"
          hint={
            hasAssessments
              ? `This draft has ${content.assessments.length} assessment row(s), so leave this off.`
              : 'This draft has no assessment, so turn this on to publish. “Not assessed” is not the same as “low risk”.'
          }
          checked={ed.status?.notAssessed === true}
          onChange={(v) => setEd({ status: { notAssessed: v } })}
          disabled={disabled}
        />
        <CheckboxRow
          label="Population unknown"
          hint={
            hasEstimates
              ? `This draft has ${content.populationEstimates.length} estimate(s), so leave this off.`
              : 'This draft has no estimate, so turn this on to publish. Unknown is never shown as zero.'
          }
          checked={ed.population?.unknown === true}
          onChange={(v) => setEd({ population: { ...ed.population, unknown: v } })}
          disabled={disabled}
        />
        <TextInput
          label="Why the population is unknown"
          hint="One line, shown next to “Unknown” on the profile."
          value={ed.population?.note ?? ''}
          onChange={(v) => setEd({ population: { unknown: ed.population?.unknown === true, note: v } })}
          maxLength={500}
          disabled={disabled}
        />
      </FormSection>

      <FormSection title="What does it eat?">
        <TextArea label="Diet" value={ed.diet?.narrative ?? ''} onChange={(v) => setEd({ diet: { ...ed.diet, narrative: v } })} rows={4} maxLength={4000} disabled={disabled} />
        <TagInput
          label="Diet tags"
          hint="Short words shown as chips on the profile. They are display only: no filter uses them yet."
          tags={ed.diet?.tags ?? []}
          onChange={(v) => setEd({ diet: { ...ed.diet, tags: v } })}
          disabled={disabled}
        />
        <TextInput
          label="Life-stage or seasonal context"
          hint="For example: tadpoles graze algae; adults are not documented."
          value={ed.diet?.context ?? ''}
          onChange={(v) => setEd({ diet: { ...ed.diet, context: v } })}
          maxLength={1000}
          disabled={disabled}
        />
      </FormSection>

      <FormSection title="Climate and measurements" hint="Typical conditions, not weather. Every number here needs a unit, a context and a citation.">
        <TextArea label="Climate" value={ed.climate?.narrative ?? ''} onChange={(v) => setEd({ climate: { ...ed.climate, narrative: v } })} rows={3} maxLength={2000} disabled={disabled} />
        <RowList<ClimateRange>
          legend="Typical ranges"
          hint="A range needs a label, a unit, a context and at least one of min or max. Adding one requires a climate citation."
          rows={ed.climate?.ranges ?? []}
          onChange={(v) => setEd({ climate: { ...ed.climate, ranges: v } })}
          blank={() => ({ label: '', unit: '', context: '' })}
          disabled={disabled}
          addLabel="Add a range"
          max={10}
          render={(row, patch) => (
            <>
              <label className="block text-sm">
                Label
                <input value={row.label} onChange={(e) => patch({ label: e.target.value })} disabled={disabled} maxLength={80} placeholder="Air temperature" className="field mt-1 py-1.5 text-sm" />
              </label>
              <label className="block text-sm">
                Unit
                <input value={row.unit} onChange={(e) => patch({ unit: e.target.value })} disabled={disabled} maxLength={20} placeholder="°C" className="field mt-1 py-1.5 text-sm" />
              </label>
              <NumberInput label="Minimum" value={row.min} onChange={(v) => patch({ min: v })} disabled={disabled} />
              <NumberInput label="Maximum" value={row.max} onChange={(v) => patch({ max: v })} disabled={disabled} />
              <label className="block text-sm sm:col-span-2">
                Region or season this applies to
                <input value={row.context} onChange={(e) => patch({ context: e.target.value })} disabled={disabled} maxLength={200} className="field mt-1 py-1.5 text-sm" />
              </label>
            </>
          )}
        />
        <RowList<Measurement>
          legend="Measurements"
          hint="A measurement needs a label, a unit and a value, min or max. Adding one requires a biology citation."
          rows={ed.measurements ?? []}
          onChange={(v) => setEd({ measurements: v })}
          blank={() => ({ label: '', unit: '' })}
          disabled={disabled}
          addLabel="Add a measurement"
          max={20}
          render={(row, patch) => (
            <>
              <label className="block text-sm">
                Label
                <input value={row.label} onChange={(e) => patch({ label: e.target.value })} disabled={disabled} maxLength={80} placeholder="Body length" className="field mt-1 py-1.5 text-sm" />
              </label>
              <label className="block text-sm">
                Unit
                <input value={row.unit} onChange={(e) => patch({ unit: e.target.value })} disabled={disabled} maxLength={20} placeholder="cm" className="field mt-1 py-1.5 text-sm" />
              </label>
              <NumberInput label="Value" value={row.value} onChange={(v) => patch({ value: v })} disabled={disabled} />
              <NumberInput label="Minimum" value={row.min} onChange={(v) => patch({ min: v })} disabled={disabled} />
              <NumberInput label="Maximum" value={row.max} onChange={(v) => patch({ max: v })} disabled={disabled} />
              <label className="block text-sm">
                Context
                <input value={row.context ?? ''} onChange={(e) => patch({ context: e.target.value })} disabled={disabled} maxLength={200} placeholder="Adult males" className="field mt-1 py-1.5 text-sm" />
              </label>
            </>
          )}
        />
      </FormSection>

      <FormSection title="Biology and conservation">
        <TextArea label="Biology" value={ed.biology ?? ''} onChange={(v) => setEd({ biology: v })} rows={4} maxLength={4000} disabled={disabled} />
        <TextArea
          label="Conservation actions"
          hint="What is being done, with a citation. Not a wish list."
          value={ed.conservationActions ?? ''}
          onChange={(v) => setEd({ conservationActions: v })}
          rows={4}
          maxLength={4000}
          disabled={disabled}
        />
      </FormSection>
    </div>
  );
}

/**
 * Removes what the editorial schema rejects: blank text, and objects or arrays that end up empty.
 * `false` and `0` are kept, because "not assessed: false" and a measurement of 0 are real statements.
 * Without this, clearing a field in the form would send "" and the API would refuse the save.
 */
export function pruneEditorial(value: unknown): unknown {
  if (typeof value === 'string') return value.trim() === '' ? undefined : value.trim();
  if (Array.isArray(value)) {
    const items = value.map(pruneEditorial).filter((x) => x !== undefined);
    return items.length ? items : undefined;
  }
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) {
      const pruned = pruneEditorial(v);
      if (pruned !== undefined) out[k] = pruned;
    }
    return Object.keys(out).length ? out : undefined;
  }
  return value ?? undefined;
}

/** What the form owns, cleaned up for the API: blank editorial text dropped, photos renumbered, blank names removed. */
export function cleanContent(content: Content): Content {
  const photos = content.media
    .map((m, i) => ({ ...m, position: i, role: i === 0 ? ('primary' as const) : ('gallery' as const), caption: m.caption?.trim() ? m.caption.trim() : null }));
  return {
    ...content,
    editorial: (pruneEditorial(content.editorial) ?? {}) as Editorial,
    names: content.names.filter((n) => n.name.trim() !== '').map((n) => ({ ...n, name: n.name.trim(), language: n.language.trim() || 'en' })),
    media: photos,
  };
}
