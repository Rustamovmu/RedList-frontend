'use client';

import { useEffect, useId, useRef, useState } from 'react';

/**
 * On small screens the filters open as a full-screen drawer; on md+ they are a normal sidebar.
 * The filter controls are rendered once (as children), so the form never submits duplicate fields.
 */
export function FilterDrawer({ appliedCount, children }: { appliedCount: number; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
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

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen(true)}
        className="btn btn-quiet w-full md:hidden"
      >
        Filters{appliedCount ? ` (${appliedCount} applied)` : ''}
      </button>
      <div
        id={panelId}
        ref={panelRef}
        role={open ? 'dialog' : undefined}
        aria-modal={open ? true : undefined}
        aria-label={open ? 'Filters' : undefined}
        className={`${open ? 'fixed inset-0 z-40 overflow-y-auto bg-black px-5 pt-5' : 'hidden'} md:static md:block md:bg-transparent md:p-0`}
      >
        <div className="mb-6 flex items-center justify-between border-b border-lime pb-4 md:hidden">
          <h2 className="type-display text-4xl text-lime">Filters</h2>
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
