/**
 * npm run basemap:fetch — puts the self-hosted basemap (DECISIONS D-060) in public/basemap/ (git-ignored):
 *
 *   world.pmtiles          zoom 0–6 of a pinned Protomaps daily build: OpenStreetMap data, distributed as an ODbL
 *                          "Produced Work"; the map shows "Protomaps © OpenStreetMap". About 60 MB.
 *                          Needs the pmtiles CLI (BSD-3-Clause): https://github.com/protomaps/go-pmtiles/releases
 *                          or `brew install pmtiles`. Set PMTILES=/path/to/pmtiles if it is not on PATH.
 *   fonts/<font>/*.pbf     Noto Sans Regular, Medium and Italic glyphs (SIL Open Font License; OFL.txt alongside). About 19 MB.
 *   sprites/v4/dark*       the dark theme's icons (derived from MIT-licensed tangrams/icons).
 *   NOTICE.txt             where each part comes from, and its licence.
 *
 * Both sources are pinned below, so every machine gets the same files; re-running replaces them. This script is the
 * only thing that contacts build.protomaps.com or GitHub. The site itself serves these files from its own origin.
 * Without them the map still works and draws our own Natural Earth land (D-004).
 *
 * Flags: --skip-tiles (fonts and icons only), --maxzoom=N (default 6; each extra level roughly doubles the file).
 */
import { spawnSync } from 'node:child_process';
import { cpSync, mkdirSync, mkdtempSync, renameSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

/** Daily build (basemap schema v4, styled by @protomaps/basemaps 5.x). List: https://maps.protomaps.com/builds */
const BUILD = '20261123';
/** protomaps/basemaps-assets, main on 2025-10-31. */
const ASSETS_COMMIT = '028c18f713baecad011301ff7a69acc39bcc2ae7';
/** The fonts the Protomaps dark theme uses (checked against its layers). */
const FONTS = ['Noto Sans Regular', 'Noto Sans Medium', 'Noto Sans Italic'];
const SPRITES = ['dark.json', 'dark.png', 'dark@2x.json', 'dark@2x.png'];

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(root, 'public', 'basemap');
const args = process.argv.slice(2);
const skipTiles = args.includes('--skip-tiles');
const maxzoom = Number(args.find((a) => a.startsWith('--maxzoom='))?.split('=')[1] ?? 6);
if (!Number.isInteger(maxzoom) || maxzoom < 0 || maxzoom > 15) {
  console.error('--maxzoom must be a whole number from 0 to 15');
  process.exit(2);
}
mkdirSync(out, { recursive: true });

async function fetchAssets() {
  const tmp = mkdtempSync(join(tmpdir(), 'basemap-assets-'));
  try {
    const url = `https://codeload.github.com/protomaps/basemaps-assets/zip/${ASSETS_COMMIT}`;
    console.log(`fonts and icons: ${url}`);
    const res = await fetch(url);
    if (!res.ok) throw new Error(`basemaps-assets download failed: HTTP ${res.status}`);
    const zip = join(tmp, 'assets.zip');
    writeFileSync(zip, Buffer.from(await res.arrayBuffer()));
    const unzip = spawnSync('unzip', ['-q', zip, '-d', tmp], { stdio: 'inherit' });
    if (unzip.status !== 0) throw new Error('unzip failed (is the unzip command installed?)');
    const src = join(tmp, `basemaps-assets-${ASSETS_COMMIT}`);
    rmSync(join(out, 'fonts'), { recursive: true, force: true });
    for (const font of FONTS) cpSync(join(src, 'fonts', font), join(out, 'fonts', font), { recursive: true });
    cpSync(join(src, 'fonts', 'OFL.txt'), join(out, 'fonts', 'OFL.txt'));
    rmSync(join(out, 'sprites'), { recursive: true, force: true });
    mkdirSync(join(out, 'sprites', 'v4'), { recursive: true });
    for (const sprite of SPRITES) cpSync(join(src, 'sprites', 'v4', sprite), join(out, 'sprites', 'v4', sprite));
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
}

/** Returns false when the pmtiles CLI is not installed. */
function fetchTiles() {
  const cli = process.env.PMTILES || 'pmtiles';
  const part = join(out, 'world.pmtiles.part');
  const source = `https://build.protomaps.com/${BUILD}.pmtiles`;
  console.log(`tiles: ${source}, zoom 0–${maxzoom}`);
  const run = spawnSync(cli, ['extract', source, part, `--maxzoom=${maxzoom}`], { stdio: 'inherit' });
  if (run.error && 'code' in run.error && run.error.code === 'ENOENT') return false;
  if (run.status !== 0) {
    rmSync(part, { force: true });
    throw new Error('pmtiles extract failed');
  }
  renameSync(part, join(out, 'world.pmtiles'));
  return true;
}

function writeNotice() {
  writeFileSync(
    join(out, 'NOTICE.txt'),
    [
      'Self-hosted basemap for the Wildward map (DECISIONS D-060). Fetched by `npm run basemap:fetch`.',
      '',
      `world.pmtiles: Protomaps basemap build ${BUILD}, zoom 0–${maxzoom} (https://build.protomaps.com/${BUILD}.pmtiles).`,
      '  Map data © OpenStreetMap contributors, Open Database License (https://www.openstreetmap.org/copyright),',
      '  distributed by Protomaps as a Produced Work; includes Natural Earth (public domain).',
      '',
      `fonts/: Noto Sans glyphs from protomaps/basemaps-assets @ ${ASSETS_COMMIT}, SIL Open Font License (fonts/OFL.txt).`,
      `sprites/v4/: dark theme icons from protomaps/basemaps-assets @ ${ASSETS_COMMIT},`,
      '  derived from tangrams/icons, MIT License (https://github.com/tangrams/icons/blob/master/LICENSE.md).',
      '',
    ].join('\n'),
  );
}

await fetchAssets();
writeNotice();
const tiles = skipTiles ? null : fetchTiles();
const size = (p) => {
  try {
    return `${(statSync(p).size / 1e6).toFixed(1)} MB`;
  } catch {
    return 'missing';
  }
};
console.log(`public/basemap/world.pmtiles: ${size(join(out, 'world.pmtiles'))}`);
if (tiles === false) {
  console.error(
    [
      '',
      'The pmtiles command was not found, so world.pmtiles was not created (fonts and icons were).',
      'Install it (BSD-3-Clause, free): `brew install pmtiles`, or download it from',
      'https://github.com/protomaps/go-pmtiles/releases, then run `npm run basemap:fetch` again',
      '(or PMTILES=/path/to/pmtiles npm run basemap:fetch). Until then the map uses its Natural Earth fallback.',
    ].join('\n'),
  );
  process.exit(1);
}
