"use client";

/**
 * Hooks used by FilmstripScrub.
 *
 * The published FilmstripScrub snippet imports these from
 * "@/components/ui/filmstrip-scrub-utils/motiq" but doesn't include that file.
 * These are stand-ins written to match how the component calls them.
 */

import * as React from "react";

const useIsomorphicLayoutEffect =
  typeof window === "undefined" ? React.useEffect : React.useLayoutEffect;

/* -------------------------------------------------------------------------- */
/* useControllableState                                                       */
/* -------------------------------------------------------------------------- */

export interface ControllableStateOptions<T> {
  /** Controlled value. Leave undefined to let the hook own the state. */
  value?: T;
  /** Starting value while uncontrolled. */
  defaultValue: T;
  /** Called with every new value, whether controlled or not. */
  onChange?: (value: T) => void;
}

/**
 * State that a parent can either control (`value` + `onChange`) or leave to the
 * hook (`defaultValue`). The setter is stable and skips values equal to the
 * current one, because FilmstripScrub calls it from its animation loop and on
 * every pointer move.
 */
export function useControllableState<T>({
  value,
  defaultValue,
  onChange,
}: ControllableStateOptions<T>): [T, (next: T) => void] {
  const [internal, setInternal] = React.useState<T>(defaultValue);
  const controlled = value !== undefined;
  const current = controlled ? (value as T) : internal;

  const latest = React.useRef({ value: current, controlled, onChange });
  useIsomorphicLayoutEffect(() => {
    latest.current = { value: current, controlled, onChange };
  });

  const setValue = React.useCallback((next: T) => {
    const state = latest.current;
    if (Object.is(next, state.value)) return;
    state.value = next;
    if (!state.controlled) setInternal(next);
    state.onChange?.(next);
  }, []);

  return [current, setValue];
}

/* -------------------------------------------------------------------------- */
/* useReducedMotion                                                           */
/* -------------------------------------------------------------------------- */

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

function subscribeReducedMotion(onChange: () => void) {
  const media = window.matchMedia(REDUCED_MOTION_QUERY);
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
}

/** True when the visitor asks for reduced motion. Always false on the server. */
export function useReducedMotion(): boolean {
  return React.useSyncExternalStore(
    subscribeReducedMotion,
    () => window.matchMedia(REDUCED_MOTION_QUERY).matches,
    () => false,
  );
}

/* -------------------------------------------------------------------------- */
/* useVisibilityPause                                                         */
/* -------------------------------------------------------------------------- */

export interface VisibilityPauseOptions {
  /** Share of the element (0–1) that must be on screen to count as visible. */
  threshold?: number;
  /** Grows or shrinks the viewport used for the check, as in IntersectionObserver. */
  rootMargin?: string;
}

function subscribePageVisibility(onChange: () => void) {
  document.addEventListener("visibilitychange", onChange);
  return () => document.removeEventListener("visibilitychange", onChange);
}

/**
 * True while the element is on screen and the browser tab is visible, so an
 * animation loop can stop when nobody can see it. Starts as true until the
 * first measurement arrives.
 */
export function useVisibilityPause(
  ref: { readonly current: Element | null },
  { threshold = 0, rootMargin = "0px" }: VisibilityPauseOptions = {},
): boolean {
  const [inView, setInView] = React.useState(true);

  const pageVisible = React.useSyncExternalStore(
    subscribePageVisibility,
    () => document.visibilityState !== "hidden",
    () => true,
  );

  React.useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[entries.length - 1];
        if (!entry) return;
        setInView(
          threshold > 0
            ? entry.isIntersecting && entry.intersectionRatio >= threshold
            : entry.isIntersecting,
        );
      },
      { threshold, rootMargin },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [ref, threshold, rootMargin]);

  return inView && pageVisible;
}
