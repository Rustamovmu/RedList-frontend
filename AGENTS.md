# AGENTS.md (frontend)

The full rules, the specification and the milestone prompts live in the backend repository:
- `../RedList-backent/AGENTS.md`: how to work (read it first)
- `../RedList-backent/docs/PLAN.md`: what to build (§4 covers pages, design and accessibility)
- `../RedList-backent/docs/COMPLETED_TASKS.md`: log every change there

Frontend-specific rules:
- Never hand-write API types. Run `npm run contracts:generate` after the backend exports `openapi.json`.
- Server components fetch through `src/lib/api.ts` with cache tags. Do not call the API from the browser except through `/api/v1`.
- Target WCAG 2.2 AA. Status colour is never the only signal; use `StatusBadge`.
- Layouts must work at 360px with no horizontal overflow.
- No placeholder screens, fake numbers or invented content. "Unknown" is a valid, visible state.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
