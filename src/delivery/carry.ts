/**
 * Paket di tangan kurier — data tulen.
 *
 * Aliran fizikal:
 *  - "Berangkat" di gudang: kurier mengangkat semua paket yang dimuat
 *    (1–3 kotak bertindan; ≥ 4 dalam guni) dan mesti meletakkannya dalam motor.
 *  - Tidak boleh menunggang sambil memegang barang.
 *  - Di alamat: ambil paket untuk alamat berdekatan dari motor, bawa ke penerima.
 *  - Penerima tiada: paket kekal di tangan dan mesti diletak semula dalam motor.
 */
import { DELIVERY_ZONES } from "@/lib/delivery-system";
import type { DeliverySession } from "@/types/delivery";
import type { Packet } from "@/types/game";

/** Jarak maksimum (m) dari motor ke pintu alamat untuk mengambil paket alamat itu. */
export const TAKE_RADIUS = 30;
/** Bilangan paket di mana kurier memakai guni, bukan kotak bertindan. */
export const SACK_FROM = 4;

export type CarryKind = "none" | "box" | "stack" | "sack";

export function inHand(s: DeliverySession): string[] {
  return s.carry ?? [];
}

export function carryKind(count: number): CarryKind {
  if (count <= 0) return "none";
  if (count === 1) return "box";
  return count >= SACK_FROM ? "sack" : "stack";
}

/** Letak semua barang di tangan ke dalam motor. */
export function stowCarry(s: DeliverySession, now: number): DeliverySession {
  const n = inHand(s).length;
  if (n === 0) return s;
  return {
    ...s,
    carry: [],
    interactionMessage: n >= SACK_FROM ? "Guni paket diikat pada motor" : "Paket diletak dalam motor",
    interactionMessageTime: now,
  };
}

/**
 * Paket dalam motor (belum di tangan, masih untuk dihantar) yang alamatnya
 * paling dekat dengan motor, dalam TAKE_RADIUS. `null` jika tiada.
 */
export function takeableFromMotor(s: DeliverySession, motor: { x: number; z: number }): Packet | null {
  if (s.phase !== "delivering" && s.phase !== "returning") return null;
  const held = new Set(inHand(s));
  let best: Packet | null = null;
  let bestD = TAKE_RADIUS;
  for (const p of s.cargo) {
    if (p.status !== "out_for_delivery" || held.has(p.id)) continue;
    const zone = DELIVERY_ZONES.find((z) => z.id === s.targets[p.id]);
    if (!zone) continue;
    const d = Math.hypot(zone.position.x - motor.x, zone.position.z - motor.z);
    if (d <= bestD) {
      bestD = d;
      best = p;
    }
  }
  return best;
}

/** Ambil paket untuk alamat berdekatan dari motor. */
export function takeFromMotor(s: DeliverySession, motor: { x: number; z: number }, now: number): DeliverySession {
  const p = takeableFromMotor(s, motor);
  if (!p) return { ...s, interactionMessage: "Tiada paket untuk alamat ini", interactionMessageTime: now };
  return {
    ...s,
    carry: [...inHand(s), p.id],
    interactionMessage: `Paket untuk ${p.receiverName} diambil`,
    interactionMessageTime: now,
  };
}
