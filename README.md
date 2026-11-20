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

Pages: home `/`, Explore `/species`, profiles `/species/<slug>`, compare `/compare?species=a,b,c`.

- **Species profiles:** `/species/<slug>` (try `fictus-regionalis` after `npm run db:seed:fixtures` in the backend).
- **Staff area:** `/admin`. Create the first admin with `npm run admin:create` in the backend. Set `REVALIDATE_SECRET` in `.env.local` to the backend's value so published changes appear immediately.

## How it talks to the API
- **Server components** call `API_INTERNAL_URL` through `src/lib/api.ts`. Calls are typed from `src/contracts/api.d.ts` and carry cache tags.
- **The browser** calls same-origin `/api/v1/*`, which `next.config.ts` rewrites to the API.
- **After publishing**, the backend calls `POST /api/revalidate` (header `x-revalidate-secret`, body `{ "tags": [...] }`) so changes appear immediately.

## Commands
`npm run typecheck` · `npm run lint` · `npm run build` · `npm run contracts:generate` · `npm run test:e2e`

`test:e2e` runs Playwright against its own stack (API :4110 on the `wild_e2e` database, web :3110 built into `.next-e2e`) using your installed Google Chrome. Docker PostGIS must be running. Your dev servers and dev database are not touched.
