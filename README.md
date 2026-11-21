# Wildward web (RedList frontend)

Next.js 16 (App Router) · React 19 · Tailwind CSS 4 · TypeScript strict.
The API, the database and **all project docs** live in `../RedList-backent` (spec: `docs/PLAN.md`; agent rules: `AGENTS.md`).

## Run locally

Start the backend first (see its README). Then:

```bash
cp .env.example .env.local    # REVALIDATE_SECRET must match the backend's
npm install
npm run contracts:generate    # types from ../RedList-backent/openapi.json
npm run dev                   # http://localhost:3000
```

Pages: home `/`, Explore `/species`, profiles `/species/<slug>`, compare `/compare?species=a,b,c`, map `/map`, regions `/regions/<slug>`, support directory `/support`, staff `/admin` (and `/admin/support`).

The map uses MapLibre GL JS with our own Natural Earth basemap from the API (no tile provider or key). `npm run dev` and `npm run build` first copy MapLibre's worker to `public/vendor/` (`scripts/copy-maplibre-worker.mjs`, DECISIONS D-016).

- **Species profiles:** `/species/<slug>` (try `fictus-regionalis` after `npm run db:seed:fixtures` in the backend).
- **Staff area:** `/admin`. Create the first admin with `npm run admin:create` in the backend. Set `REVALIDATE_SECRET` in `.env.local` to the backend's value so published changes appear immediately.

## How it talks to the API
- **Server components** call `API_INTERNAL_URL` through `src/lib/api.ts`. Calls are typed from `src/contracts/api.d.ts` and carry cache tags.
- **The browser** calls same-origin `/api/v1/*`, which `next.config.ts` rewrites to the API.
- **After publishing**, the backend calls `POST /api/revalidate` (header `x-revalidate-secret`, body `{ "tags": [...] }`) so changes appear immediately.

## Commands
`npm run typecheck` · `npm run lint` · `npm run build` · `npm run contracts:generate` · `npm run test:e2e`

## Security headers
`src/proxy.ts` sets a Content Security Policy with a fresh nonce on every page (scripts: nonce + `'strict-dynamic'` only). The root layout calls `connection()` so every page renders per request and receives it. Other headers are in `next.config.ts`. Details: backend `docs/DECISIONS.md` D-029. Adding a third-party script or host means changing that policy on purpose.

## Production image
`Dockerfile` builds the standalone server. It is built by the backend's `deploy/docker-compose.prod.yml`, with `NEXT_PUBLIC_SITE_URL` as a build argument: see `../RedList-backent/docs/DEPLOYMENT.md`.

## Tests
`test:e2e` runs Playwright against its own stack (API :4110 on the `wild_e2e` database, web :3110 built into `.next-e2e`) using your installed Google Chrome. Docker PostGIS must be running. Your dev servers and dev database are not touched. Suites: `critical` (M2 journey), `geography` (map with tiles blocked), `content` (offline profiles), `pages` (info pages and SEO), `release`: axe with no serious or critical violations on 18 core pages, the CSP checks, and a keyboard-only walkthrough; and `a11y-extra`: reflow at 320 and 640 px, heading and landmark structure, and axe on the staff pages after signing in with an e2e-only admin. CI (`.github/workflows/ci.yml`) runs all of this on GitHub's standard runners, with the API repo cloned alongside. More in `../RedList-backent/docs/TESTING.md`.
