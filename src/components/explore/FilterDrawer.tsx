'use client';

import { useEffect, useId, useRef, useState } from 'react';

/**
 * On small screens the filters open as a full-screen drawer; on md+ they are a normal sidebar.
 * The filter controls are rendered once (as children), so the form never submits duplicate fields.
 * Once a filter changes, the panel carries `data-dirty`: on md+ that pins the Apply bar (`.filter-apply`) to the bottom of
 * the window, so it follows the visitor only after there is something to apply (D-059).
 */
export function FilterDrawer({ appliedCount, children }: { appliedCount: number; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [dirty, setDirty] = useState(false);
  const panelId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    panelRef.current?.querySelector<HTMLElement>('input, select')?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  /** Marks the filters as changed, then keeps the control just used clear of the now-pinned Apply bar (its inputs carry a scroll margin). */
  function onFilterChange(e: React.FormEvent<HTMLDivElement>) {
    setDirty(true);
    const target = e.target;
    if (!(target instanceof HTMLInputElement)) return;
    const smooth = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    // The next frame, once data-dirty has pinned the bar.
    requestAnimationFrame(() => target.scrollIntoView({ block: 'nearest', behavior: smooth ? 'smooth' : 'auto' }));
  }

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen(true)}
        className="btn btn-soft w-full md:hidden"
      >
        Filters{appliedCount ? ` (${appliedCount} applied)` : ''}
      </button>
      <div
        id={panelId}
        ref={panelRef}
        role={open ? 'dialog' : undefined}
        aria-modal={open ? true : undefined}
        aria-label={open ? 'Filters' : undefined}
        data-dirty={dirty ? '' : undefined}
        onChange={onFilterChange}
        className={`filter-panel ${open ? 'fixed inset-0 z-40 overflow-y-auto bg-black px-5 pt-5' : 'hidden'} md:static md:block md:bg-transparent md:p-0`}
      >
        <div className="mb-6 flex items-center justify-between border-b border-rule pb-4 md:hidden">
          <h2 className="text-2xl font-bold tracking-[-0.02em] text-white">Filters</h2>
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              buttonRef.current?.focus();
            }}
            className="btn btn-sm btn-quiet"
          >
            Close
          </button>
        </div>
        {children}
      </div>
    </>
  );
}
