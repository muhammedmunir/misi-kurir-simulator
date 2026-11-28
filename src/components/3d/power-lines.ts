import type { Placement } from "./city-blocks";

/** Titik ikat kabel pada palang tiang (relatif pusat tiang, dalam meter) dan bilangan ruas setiap rentang. */
export const CABLE_ANCHORS = [
  { dx: -0.68, y: 6.3 },
  { dx: 0.62, y: 6.3 },
  { dx: -0.05, y: 6.75 },
] as const;
export const CABLE_SAG = 0.55;
const SEGMENTS = 8;
const MAX_SPAN = 21;

/**
 * Kabel elektrik melendut antara tiang berjiran dalam lajur yang sama (x sama, jarak z ≤ MAX_SPAN).
 * Dipulangkan sebagai pasangan titik untuk `LineSegments` (x, y, z berturutan).
 */
export function powerLineSegments(poles: readonly Placement[]): Float32Array {
  const columns = new Map<number, number[]>();
  for (const p of poles) {
    const list = columns.get(p.x) ?? [];
    list.push(p.z);
    columns.set(p.x, list);
  }
  const out: number[] = [];
  for (const [x, zs] of columns) {
    zs.sort((a, b) => a - b);
    for (let i = 1; i < zs.length; i++) {
      const z0 = zs[i - 1];
      const z1 = zs[i];
      if (z1 - z0 > MAX_SPAN) continue;
      for (const { dx, y } of CABLE_ANCHORS) {
        for (let s = 0; s < SEGMENTS; s++) {
          for (const t of [s / SEGMENTS, (s + 1) / SEGMENTS]) {
            // Lendutan parabola: 0 di hujung, CABLE_SAG di tengah.
            out.push(x + dx, y - 4 * CABLE_SAG * t * (1 - t), z0 + (z1 - z0) * t);
          }
        }
      }
    }
  }
  return new Float32Array(out);
}
