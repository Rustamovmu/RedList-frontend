/**
 * Joins class names, skipping empty ones. The vendored filmstrip (components/ui/filmstrip-scrub.tsx, D-067) imports
 * shadcn's `cn` from here. This site has no shadcn, and nothing passes the filmstrip a class that conflicts with its
 * own, so plain joining is enough: no clsx or tailwind-merge dependency.
 */
export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(' ');
}
