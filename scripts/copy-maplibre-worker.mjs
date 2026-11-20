/**
 * MapLibre GL 6 runs its tile/GeoJSON work in a module worker that it locates with `new URL(..., import.meta.url)`.
 * The Next.js production bundler does not emit that file, so the map failed with "Worker failed to load".
 * This copies the (self-contained, BSD-3-Clause) worker into public/vendor/ under a versioned name, and
 * WorldMap points MapLibre at it with setWorkerUrl(). Runs before `dev` and `build` (npm pre-scripts).
 */
import { copyFileSync, mkdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const pkg = join(root, 'node_modules', 'maplibre-gl');
const { version } = JSON.parse(readFileSync(join(pkg, 'package.json'), 'utf8'));
const out = join(root, 'public', 'vendor');
mkdirSync(out, { recursive: true });
copyFileSync(join(pkg, 'dist', 'maplibre-gl-worker.mjs'), join(out, `maplibre-gl-worker-${version}.mjs`));
console.log(`maplibre worker ${version} → public/vendor/`);
