/**
 * Collision dunia untuk watak dan motor — data tulen, tiada React/three.
 * Semua halangan ialah segi empat paksi-sejajar pada satah XZ; badan
 * pemain/motor ialah bulatan. Kamera memakai kotak 3D sendiri
 * (`camera-collision.ts`), yang tidak termasuk dinding gudang.
 */
import { WAREHOUSE } from "@/warehouse/warehouse-logic";
import { cameraObstacles } from "./camera-collision";

export type Rect = { minX: number; maxX: number; minZ: number; maxZ: number };
export type P2 = { x: number; z: number };

/** Ketebalan dinding gudang — juga dipakai oleh `WarehouseBuilding.tsx`. */
export const WAREHOUSE_WALL_T = 0.4;

export const PLAYER_RADIUS = 0.35;
export const MOTOR_RADIUS = 0.7;

function rect(cx: number, cz: number, w: number, d: number): Rect {
  return { minX: cx - w / 2, maxX: cx + w / 2, minZ: cz - d / 2, maxZ: cz + d / 2 };
}

/** Dinding gudang (pintu menghadap −z), meja sortir dan rak paket. */
export function warehouseColliders(): Rect[] {
  const { center, width, depth, doorWidth } = WAREHOUSE;
  const cx = center.x;
  const cz = center.z;
  const halfW = width / 2;
  const halfD = depth / 2;
  const t = WAREHOUSE_WALL_T;
  const sideOfDoor = (width - doorWidth) / 2;
  const out: Rect[] = [
    rect(cx, cz + halfD, width, t), // belakang
    rect(cx - halfW, cz, t, depth), // kiri
    rect(cx + halfW, cz, t, depth), // kanan
    rect(cx - (doorWidth / 2 + sideOfDoor / 2), cz - halfD, sideOfDoor, t), // depan, kiri pintu
    rect(cx + (doorWidth / 2 + sideOfDoor / 2), cz - halfD, sideOfDoor, t), // depan, kanan pintu
    rect(cx, cz + 2.5, 4, 1.2), // meja sortir
  ];
  for (const x of [-6, -3, 3, 6]) out.push(rect(cx + x, cz + halfD - 1, 2.4, 1)); // rak
  return out;
}

/** Semua halangan pejal: bangunan bandar, rumah alamat dan gudang. */
export function worldColliders(): Rect[] {
  const fromCamera = cameraObstacles().map((b) => ({ minX: b.minX, maxX: b.maxX, minZ: b.minZ, maxZ: b.maxZ }));
  return [...fromCamera, ...warehouseColliders()];
}

/**
 * Tolak bulatan (pusat `p`, jejari `r`) keluar daripada setiap segi empat.
 * Dua laluan supaya sudut antara dua halangan juga diselesaikan.
 * `hit` = true jika kedudukan diubah.
 */
export function resolveCircle(p: P2, r: number, rects: readonly Rect[]): { x: number; z: number; hit: boolean } {
  let { x, z } = p;
  let hit = false;
  for (let pass = 0; pass < 2; pass++) {
    for (const b of rects) {
      if (x < b.minX - r || x > b.maxX + r || z < b.minZ - r || z > b.maxZ + r) continue;
      const nx = Math.min(Math.max(x, b.minX), b.maxX);
      const nz = Math.min(Math.max(z, b.minZ), b.maxZ);
      const dx = x - nx;
      const dz = z - nz;
      const d2 = dx * dx + dz * dz;
      if (d2 >= r * r) continue;
      hit = true;
      if (d2 > 1e-12) {
        // Pusat di luar kotak: tolak sepanjang normal titik terdekat.
        const d = Math.sqrt(d2);
        x = nx + (dx / d) * r;
        z = nz + (dz / d) * r;
      } else {
        // Pusat di dalam kotak: keluar melalui sisi yang paling dekat.
        const exits = [
          { dist: x - b.minX, x: b.minX - r, z },
          { dist: b.maxX - x, x: b.maxX + r, z },
          { dist: z - b.minZ, x, z: b.minZ - r },
          { dist: b.maxZ - z, x, z: b.maxZ + r },
        ];
        exits.sort((a, c) => a.dist - c.dist);
        x = exits[0].x;
        z = exits[0].z;
      }
    }
  }
  return { x, z, hit };
}

/**
 * Arah gerak dunia (heading, radian) bagi input joystick/WASD relatif kepada
 * kamera. Kamera memandang ke `viewYaw` (hadapan = (sin h, cos h)); kanan skrin
 * = (−cos h, sin h), iaitu heading berkurang. `null` jika tiada input.
 */
export function moveHeading(viewYaw: number, forward: number, right: number): number | null {
  if (Math.abs(forward) <= 0.15 && Math.abs(right) <= 0.15) return null;
  return viewYaw - Math.atan2(right, forward);
}

/** Beza sudut terpendek a − b dalam (−π, π]. */
export function angleDelta(a: number, b: number): number {
  let d = (a - b) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d <= -Math.PI) d += Math.PI * 2;
  return d;
}
