import { DELIVERY_ZONES, nextTargetZone } from "@/lib/delivery-system";
import type { DeliverySession, DeliveryZone } from "@/types/delivery";

/**
 * Hitung jarak dan sudut belok dari posisi pemain ke sasaran.
 *
 * @param from  posisi pemain { x, z }
 * @param heading  arah hadapan pemain (heading, radian) — (sin h, cos h)
 * @param to     sasaran { x, z }
 * @returns { distance, turn } turn positif = kanan (ikut jam)
 */
export function navTo(
  from: { x: number; z: number },
  heading: number,
  to: { x: number; z: number },
): { distance: number; turn: number } {
  const dx = to.x - from.x;
  const dz = to.z - from.z;
  const distance = Math.sqrt(dx * dx + dz * dz);

  if (distance < 0.001) {
    return { distance: 0, turn: 0 };
  }

  // Arah ke sasaran dalam koordinat (x, z): atan2(dx, dz)
  const targetAngle = Math.atan2(dx, dz);

  // turn = sudut belok untuk menghadap sasaran (positif = kanan)
  let turn = heading - targetAngle;

  // Normalisasi ke (-π, π]
  while (turn > Math.PI) {
    turn -= 2 * Math.PI;
  }
  while (turn <= -Math.PI) {
    turn += 2 * Math.PI;
  }

  return { distance, turn };
}

/**
 * Format jarak dalam meter (bundar) atau kilometer (1 perpuluhan).
 */
export function formatDistance(m: number): string {
  if (m < 1000) {
    return `${Math.round(m)} m`;
  }
  return `${(m / 1000).toFixed(1)} km`;
}

/**
 * Tentukan sasaran navigasi semasa dari sesi penghantaran.
 *
 * - `complete` → null (tiada sasaran)
 * - `delivering` → zon alamat paket seterusnya (guna `nextTargetZone`)
 * - `idle` / `loading` → meja gudang (zon `pickup`)
 */
export function currentNavTarget(session: DeliverySession): DeliveryZone | null {
  if (session.phase === "complete") {
    return null;
  }

  if (session.phase === "delivering") {
    return nextTargetZone(session);
  }

  // Default: meja gudang
  return DELIVERY_ZONES.find((z) => z.type === "pickup") ?? null;
}
