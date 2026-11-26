/**
 * Susun atur jubin jalan Kenney — data tulen.
 * Jalan 12 m lebar pada gandaan 40 m (−120…120), panjang ±200 m.
 * Simpang: jubin simpang empat 12×12 di setiap persilangan.
 * Lurus: segmen antara simpang dibahagi kepada jubin ~12 m.
 */

export const ROAD_LINES = [-120, -80, -40, 0, 40, 80, 120] as const;
const ROAD_WIDTH = 12;
const ROAD_HALF_LEN = 200;

export type RoadTile = {
  kind: "straight" | "cross";
  x: number;
  z: number;
  /** Saiz dalam paksi setempat jubin: w merentasi jalan, len sepanjang jalan. */
  w: number;
  len: number;
  /** Jalan menghala paksi z (utara-selatan) atau x (timur-barat). */
  axis: "x" | "z";
};

/** Segmen lurus [a, b] sepanjang satu jalan, tidak termasuk kawasan simpang. */
function segments(): [number, number][] {
  const half = ROAD_WIDTH / 2;
  const stops = [-ROAD_HALF_LEN, ...ROAD_LINES.flatMap((c) => [c - half, c + half]), ROAD_HALF_LEN];
  const out: [number, number][] = [];
  for (let i = 0; i < stops.length; i += 2) out.push([stops[i], stops[i + 1]]);
  return out;
}

export function roadTiles(): RoadTile[] {
  const tiles: RoadTile[] = [];
  for (const cx of ROAD_LINES) {
    for (const cz of ROAD_LINES) {
      tiles.push({ kind: "cross", x: cx, z: cz, w: ROAD_WIDTH, len: ROAD_WIDTH, axis: "z" });
    }
  }
  for (const [a, b] of segments()) {
    const len = b - a;
    const n = Math.max(1, Math.round(len / ROAD_WIDTH));
    const step = len / n;
    for (let i = 0; i < n; i++) {
      const mid = a + step * (i + 0.5);
      for (const line of ROAD_LINES) {
        tiles.push({ kind: "straight", x: line, z: mid, w: ROAD_WIDTH, len: step, axis: "z" });
        tiles.push({ kind: "straight", x: mid, z: line, w: ROAD_WIDTH, len: step, axis: "x" });
      }
    }
  }
  return tiles;
}

/** Lampu jalan di kaki lima: setiap segmen di antara simpang, di sebelah kanan arah +. */
export function streetLamps(): { x: number; z: number; rotY: number }[] {
  const out: { x: number; z: number; rotY: number }[] = [];
  const off = ROAD_WIDTH / 2 - 0.6;
  for (const line of ROAD_LINES) {
    for (let k = -4; k < 4; k++) {
      // Anjak 10 m dari tengah blok supaya tidak jatuh di kotak parkir alamat.
      const mid = k * 40 + 30;
      if (Math.abs(mid) > ROAD_HALF_LEN) continue;
      out.push({ x: line + off, z: mid, rotY: Math.PI / 2 }); // jalan utara-selatan
      out.push({ x: mid, z: line - off, rotY: 0 }); // jalan timur-barat
    }
  }
  return out;
}
