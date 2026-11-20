/**
 * Small geometry helpers for the map. Everything here runs in the browser and never sends a position anywhere.
 * bbox convention (same as the API): [west, south, east, north]; west > east means it crosses the antimeridian.
 */
export type Bbox = [number, number, number, number];
export const WORLD: Bbox = [-180, -90, 180, 90];

const round = (x: number) => Math.round(x * 1e4) / 1e4;
const wrapLon = (x: number) => ((((x + 180) % 360) + 360) % 360) - 180;
const clampLat = (y: number) => Math.max(-90, Math.min(90, y));

/** MapLibre bounds can run past ±180 when the view wraps. Normalize them to the API's convention. */
export function normalizeBounds(west: number, south: number, east: number, north: number): Bbox {
  const s = round(clampLat(south));
  const n = round(clampLat(north));
  if (east - west >= 360 || s >= n) return [-180, s < n ? s : -90, 180, s < n ? n : 90];
  let w = round(wrapLon(west));
  let e = round(wrapLon(east));
  if (e === -180 && east > west) e = 180; // a view ending exactly at 180° does not cross it
  if (w === 180) w = -180;
  if (w === e) return [-180, s, 180, n];
  return [w, s, e, n];
}

export const bboxParam = (b: Bbox) => b.join(',');

export function parseBboxParam(raw: string | undefined): Bbox | null {
  if (!raw) return null;
  const parts = raw.split(',').map(Number);
  if (parts.length !== 4 || parts.some((x) => !Number.isFinite(x))) return null;
  const [w, s, e, n] = parts;
  if (Math.abs(w) > 180 || Math.abs(e) > 180 || Math.abs(s) > 90 || Math.abs(n) > 90 || s >= n || w === e) return null;
  return [w, s, e, n];
}

/** For MapLibre fitBounds: a crossing box is expressed with an east edge past 180. */
export const fitTarget = (b: Bbox): [[number, number], [number, number]] => [
  [b[0], b[1]],
  [b[2] < b[0] ? b[2] + 360 : b[2], b[3]],
];

/**
 * The smallest box around some MultiPolygons. Shapes split at ±180 (Fiji) would span the whole world in
 * -180…180, so the box is also measured in 0…360 and the narrower one wins (returned with west > east).
 */
export function boundsOf(shapes: number[][][][][]): Bbox | null {
  const pts = shapes.flatMap((mp) => mp.flatMap((poly) => poly.flatMap((ring) => ring)));
  if (!pts.length) return null;
  const lats = pts.map((p) => p[1]);
  const lons = pts.map((p) => p[0]);
  const shifted = lons.map((x) => (x < 0 ? x + 360 : x));
  const s = Math.min(...lats);
  const n = Math.max(...lats);
  const [w1, e1] = [Math.min(...lons), Math.max(...lons)];
  const [w2, e2] = [Math.min(...shifted), Math.max(...shifted)];
  if (e2 - w2 < e1 - w1) return [w2 > 180 ? w2 - 360 : w2, s, e2 > 180 ? e2 - 360 : e2, n];
  return [w1, s, e1, n];
}

type Ring = number[][];
function inRing(x: number, y: number, ring: Ring): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

/** Point-in-MultiPolygon (holes respected). Used only by "Near me", entirely in the browser. */
export function containsPoint(coords: number[][][][], lon: number, lat: number): boolean {
  return coords.some((poly) => inRing(lon, lat, poly[0]) && !poly.slice(1).some((hole) => inRing(lon, lat, hole)));
}
