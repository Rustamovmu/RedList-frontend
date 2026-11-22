'use client';

import { useId, useState } from 'react';

/**
 * Small labelled inputs for the staff editor. Every control carries a real <label> (axe runs over
 * /admin/revisions/[id] in e2e/a11y-extra.spec.ts), and empty values are reported as empty strings;
 * the editor prunes them before saving, because the editorial schema rejects blank text.
 */

export function FormSection({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  const id = useId();
  return (
    <section aria-labelledby={id} className="panel p-5">
      <h3 id={id} className="text-base font-bold text-white">{title}</h3>
      {hint ? <p className="mt-1 text-[0.8125rem] text-muted">{hint}</p> : null}
      <div className="mt-4 grid gap-4">{children}</div>
    </section>
  );
}

type BaseProps = {
  label: string;
  value: string;
  onChange: (v: string) => void;
  hint?: string;
  disabled?: boolean;
  placeholder?: string;
  maxLength?: number;
  required?: boolean;
};

function Labelled({ label, hint, required, children }: { label: string; hint?: string; required?: boolean; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-sm font-medium">
        {label}
        {required ? <span className="text-lime"> *</span> : <span className="text-muted"> (optional)</span>}
      </span>
      {hint ? <span className="mt-0.5 block text-[0.8125rem] text-muted">{hint}</span> : null}
      {children}
    </label>
  );
}

export function TextInput({ label, value, onChange, hint, disabled, placeholder, maxLength, required }: BaseProps) {
  return (
    <Labelled label={label} hint={hint} required={required}>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        placeholder={placeholder}
        maxLength={maxLength}
        className="field mt-1"
      />
    </Labelled>
  );
}

export function TextArea({ label, value, onChange, hint, disabled, rows = 4, maxLength, required }: BaseProps & { rows?: number }) {
  return (
    <Labelled label={label} hint={hint} required={required}>
      <textarea value={value} onChange={(e) => onChange(e.target.value)} disabled={disabled} rows={rows} maxLength={maxLength} className="field mt-1" />
    </Labelled>
  );
}

/** A number field that keeps "empty" distinct from 0: it reports undefined when cleared. */
export function NumberInput({
  label, value, onChange, hint, disabled, required,
}: Omit<BaseProps, 'value' | 'onChange'> & { value: number | undefined; onChange: (v: number | undefined) => void }) {
  return (
    <Labelled label={label} hint={hint} required={required}>
      <input
        type="number"
        step="any"
        value={value === undefined ? '' : String(value)}
        onChange={(e) => onChange(e.target.value === '' ? undefined : Number(e.target.value))}
        disabled={disabled}
        className="field mt-1"
      />
    </Labelled>
  );
}

export function CheckboxRow({ label, hint, checked, onChange, disabled }: { label: string; hint?: string; checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <label className="flex items-start gap-2.5">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} disabled={disabled} className="mt-1 size-4 accent-lime" />
      <span>
        <span className="text-sm font-medium">{label}</span>
        {hint ? <span className="block text-[0.8125rem] text-muted">{hint}</span> : null}
      </span>
    </label>
  );
}

/** Free-text tags (diet tags). Enter or the Add button adds one; each chip has its own remove button. */
export function TagInput({ label, hint, tags, onChange, disabled, max = 20 }: { label: string; hint?: string; tags: string[]; onChange: (v: string[]) => void; disabled?: boolean; max?: number }) {
  const [draft, setDraft] = useState('');
  const id = useId();

  function add() {
    const v = draft.trim();
    if (!v || tags.length >= max) return;
    if (!tags.some((t) => t.toLowerCase() === v.toLowerCase())) onChange([...tags, v.slice(0, 40)]);
    setDraft('');
  }

  return (
    <div>
      <label htmlFor={id} className="text-sm font-medium">
        {label} <span className="text-muted">(optional)</span>
      </label>
      {hint ? <p className="mt-0.5 text-[0.8125rem] text-muted">{hint}</p> : null}
      {tags.length ? (
        <ul className="mt-2 flex flex-wrap gap-2">
          {tags.map((t, i) => (
            <li key={`${t}-${i}`} className="chip flex items-center gap-1.5 pr-1.5">
              {t}
              <button
                type="button"
                disabled={disabled}
                onClick={() => onChange(tags.filter((_, j) => j !== i))}
                aria-label={`Remove tag ${t}`}
                className="rounded px-1 text-muted hover:text-alert"
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      <span className="mt-2 flex flex-wrap gap-2">
        <input
          id={id}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              add();
            }
          }}
          disabled={disabled || tags.length >= max}
          maxLength={40}
          placeholder="fruit, insects, carrion…"
          className="field w-auto flex-1 py-1.5 text-sm"
        />
        <button type="button" onClick={add} disabled={disabled || !draft.trim() || tags.length >= max} className="btn btn-sm btn-secondary">
          Add tag
        </button>
      </span>
    </div>
  );
}

/** A repeatable block of rows, with Add and Remove. `render` draws one row. */
export function RowList<T>({
  legend, hint, rows, onChange, blank, render, disabled, addLabel, max = 20,
}: {
  legend: string;
  hint?: string;
  rows: T[];
  onChange: (v: T[]) => void;
  blank: () => T;
  render: (row: T, set: (patch: Partial<T>) => void, index: number) => React.ReactNode;
  disabled?: boolean;
  addLabel: string;
  max?: number;
}) {
  return (
    <fieldset>
      <legend className="text-sm font-medium">{legend}</legend>
      {hint ? <p className="mt-0.5 text-[0.8125rem] text-muted">{hint}</p> : null}
      <ul className="mt-2 grid gap-3">
        {rows.map((row, i) => (
          <li key={i} className="grid gap-2 border border-rule p-3 sm:grid-cols-[1fr_auto] sm:items-end">
            <div className="grid gap-2 sm:grid-cols-2">
              {render(row, (patch) => onChange(rows.map((r, j) => (j === i ? { ...r, ...patch } : r))), i)}
            </div>
            <button type="button" disabled={disabled} onClick={() => onChange(rows.filter((_, j) => j !== i))} className="btn btn-sm btn-quiet">
              Remove
            </button>
          </li>
        ))}
      </ul>
      <button type="button" disabled={disabled || rows.length >= max} onClick={() => onChange([...rows, blank()])} className="btn btn-sm btn-secondary mt-3">
        {addLabel}
      </button>
    </fieldset>
  );
}
