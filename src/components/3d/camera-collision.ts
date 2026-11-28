/**
 * Pengelakan halangan kamera — data tulen, tiada React/three.
 * Kamera third-person diletakkan pada sinar eye → desired; jika sinar
 * memasuki mana-mana kotak halangan, kamera dipegat 0.3 unit sebelum
 * titik masuk terawal supaya tidak berada di dalam bangunan.
 */
import { blockPlacements, placementFootprint } from "./city-blocks";
import { buildingLayout } from "./city-layout";
import { destinationHouses } from "./kenney-building-model";

export type P3 = { x: number; y: number; z: number };

export type Aabb = {
  minX: number;
  minY: number;
  minZ: number;
  maxX: number;
  maxY: number;
  maxZ: number;
};

/** Jarak aman (unit dunia) antara kamera dan dinding. */
const CAMERA_PADDING = 0.3;

/**
 * Kotak halangan kamera: badan setiap bangunan bandar (lantai hingga
 * bumbung) dan badan setiap rumah alamat. Gudang sengaja dikecualikan —
 * pemain perlu melihat ke dalamnya semasa memuat paket.
 */
export function cameraObstacles(): Aabb[] {
  const boxes: Aabb[] = [];

  for (const b of buildingLayout()) {
    boxes.push({
      minX: b.x - b.width / 2,
      maxX: b.x + b.width / 2,
      minY: 0,
      maxY: b.height,
      minZ: b.z - b.depth / 2,
      maxZ: b.z + b.depth / 2,
    });
  }

  for (const { x, z, w, h, d } of destinationHouses()) {
    boxes.push({ minX: x - w / 2, maxX: x + w / 2, minY: 0, maxY: h, minZ: z - d / 2, maxZ: z + d / 2 });
  }

  for (const p of blockPlacements()) {
    if (p.solid && p.h >= 2) boxes.push({ ...placementFootprint(p), minY: 0, maxY: p.h });
  }

  return boxes;
}

/**
 * Parameter t pada titik masuk sinar eye → eye+d. Sifar jika bermula dalam kotak,
 * atau `null` jika sinar tidak memotong kotak.
 */
function entryT(eye: P3, d: P3, b: Aabb): number | null {
  let tNear = 0;
  let tFar = Number.POSITIVE_INFINITY;

  const axes: [number, number, number, number][] = [
    [eye.x, d.x, b.minX, b.maxX],
    [eye.y, d.y, b.minY, b.maxY],
    [eye.z, d.z, b.minZ, b.maxZ],
  ];

  for (const [e, dir, lo, hi] of axes) {
    if (dir === 0) {
      // Sinar selari dengan satah ini; mesti berada dalam julat kotak.
      if (e < lo || e > hi) return null;
      continue;
    }
    const t1 = (lo - e) / dir;
    const t2 = (hi - e) / dir;
    tNear = Math.max(tNear, Math.min(t1, t2));
    tFar = Math.min(tFar, Math.max(t1, t2));
    if (tNear > tFar) return null;
  }

  return tNear;
}

export function occluders(eye: P3, cam: P3, boxes: readonly Aabb[]): number[] {
  const d = { x: cam.x - eye.x, y: cam.y - eye.y, z: cam.z - eye.z };
  const hits: number[] = [];
  if (d.x === 0 && d.y === 0 && d.z === 0) return hits;
  for (let i = 0; i < boxes.length; i++) {
    const t = entryT(eye, d, boxes[i]);
    if (t !== null && t <= 1) hits.push(i);
  }
  return hits;
}

/** Indeks kotak yang mengandungi titik `p` (kamera di dalam bangunan). */
export function containing(p: P3, boxes: readonly Aabb[]): number[] {
  const out: number[] = [];
  for (let i = 0; i < boxes.length; i++) {
    const b = boxes[i];
    if (p.x > b.minX && p.x < b.maxX && p.y > b.minY && p.y < b.maxY && p.z > b.minZ && p.z < b.maxZ) out.push(i);
  }
  return out;
}

/**
 * Klamp kedudukan kamera `desired` supaya kamera tidak masuk ke dalam
 * mana-mana kotak. Kamera diletak pada titik masuk terawal tolak padding
 * 0.3 unit sepanjang sinar, tidak kurang daripada `eye`. Tanpa halangan,
 * `desired` dikembalikan tanpa ubah.
 */
export function clampCamera(eye: P3, desired: P3, boxes: Aabb[]): P3 {
  const d = { x: desired.x - eye.x, y: desired.y - eye.y, z: desired.z - eye.z };
  const len = Math.hypot(d.x, d.y, d.z);
  if (len === 0) return { x: eye.x, y: eye.y, z: eye.z };

  let tHit = Number.POSITIVE_INFINITY;
  for (const box of boxes) {
    const t = entryT(eye, d, box);
    if (t !== null && t > 0 && t <= 1 && t < tHit) tHit = t;
  }
  if (tHit === Number.POSITIVE_INFINITY) return desired;

  const t = Math.max(0, tHit - CAMERA_PADDING / len);
  return {
    x: eye.x + d.x * t,
    y: eye.y + d.y * t,
    z: eye.z + d.z * t,
  };
}
