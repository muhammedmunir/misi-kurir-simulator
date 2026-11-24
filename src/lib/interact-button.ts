import type { DeliverySession } from "@/types/delivery";

/**
 * `getInteractButtonInfo` — fungsi tulen: session → { label, enabled }.
 * Label berubah ikut konteks delivery state.
 * enabled = false apabila tiada zon berdekatan atau sesi sedang disekat.
 */
export function getInteractButtonInfo(session: DeliverySession, now: number): { label: string; enabled: boolean } {
  // Sedang dalam cooldown → nyahaktif
  if (now < session.cooldownUntil) {
    return { label: "Tunggu...", enabled: false };
  }

  // Tiada zon berdekatan → nyahaktif
  if (!session.nearbyZone) {
    return { label: "Tiada zon", enabled: false };
  }

  // Zon pickup + tiada paket → AMBIL PAKET
  if (session.nearbyZone.type === "pickup" && !session.hasPacket) {
    return { label: "AMBIL PAKET", enabled: true };
  }

  // Zon pickup + sudah ada paket → nothing (nyahaktif)
  if (session.nearbyZone.type === "pickup" && session.hasPacket) {
    return { label: "Hantar dulu", enabled: false };
  }

  // Zon delivery + ada paket → HANTAR PAKET
  if (session.nearbyZone.type === "delivery" && session.hasPacket) {
    return { label: "HANTAR PAKET", enabled: true };
  }

  // Zon delivery + tiada paket → nothing (nyahaktif)
  if (session.nearbyZone.type === "delivery" && !session.hasPacket) {
    return { label: "Tiada paket", enabled: false };
  }

  // Idle, tiada aksi
  return { label: "Tiada", enabled: false };
}
