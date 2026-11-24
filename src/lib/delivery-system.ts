import type { DeliveryResult, DeliverySession, DeliveryZone } from "@/types/delivery";

// ── Zone Data ────────────────────────────────────────────────────

export const DELIVERY_ZONES: DeliveryZone[] = [
  {
    id: "zone-pickup-1",
    name: "Pejabat Pos Pusat",
    type: "pickup",
    position: { x: 0, z: 0 },
    areaCode: "bandar",
    description: "Balik pos untuk penghantaran pertama",
    interactable: true,
  },
  {
    id: "zone-delivery-1",
    name: "Kedai Runcit Mak Amin",
    type: "delivery",
    position: { x: 40, z: 40 },
    areaCode: "perumahan",
    description: "Penghantaran ke kedai runcit",
    interactable: true,
  },
  {
    id: "zone-delivery-2",
    name: "Kafe Kampung Digital",
    type: "delivery",
    position: { x: -40, z: -40 },
    areaCode: "pasar",
    description: "Penghantaran ke kafe tempatan",
    interactable: true,
  },
  {
    id: "zone-delivery-3",
    name: "Pusat Industri Timur",
    type: "delivery",
    position: { x: 80, z: -40 },
    areaCode: "industri",
    description: "Penghantaran kargo industri",
    interactable: true,
  },
  {
    id: "zone-pickup-2",
    name: "Pejabat Pos Timur",
    type: "pickup",
    position: { x: 80, z: 40 },
    areaCode: "bandar",
    description: "Balik pos kedua untuk penghantaran baru",
    interactable: true,
  },
];

// ── Pure State Functions (boleh diuji) ─────────────────────────

/** Cipta session baharu dari keadaan kosong. */
export function createSession(): DeliverySession {
  return {
    state: "idle",
    packetId: null,
    trackingNumber: null,
    targetZone: null,
    reward: 0,
    xpReward: 0,
    hasPacket: false,
    nearbyZone: null,
    cooldownUntil: 0,
    deliveredAt: null,
  };
}

/**
 * `tick` — panggil setiap frame. Uruskan auto-reset dan cooldown.
 * Mengembalikan session baharu (stateless, pure).
 */
export function tickSession(session: DeliverySession, now: number, autoResetMs = 5000): DeliverySession {
  const next = { ...session };

  // Auto-reset: complete → idle selepas autoResetMs
  if (next.state === "complete" && next.deliveredAt != null && now - next.deliveredAt >= autoResetMs) {
    next.state = "idle";
    next.targetZone = null;
    next.reward = 0;
    next.xpReward = 0;
    next.deliveredAt = null;
  }

  return next;
}

/**
 * `interact` — panggil apabila pengguna menekan E.
 * Mengembalikan { result, session } atau `null` jika disekat.
 * Tiada side-effect: RNG, ID, tracking-number diterima sebagai argumen.
 */
export function interact(
  session: DeliverySession,
  nearbyZone: DeliveryZone | null,
  now: number,
  createId: () => string,
  createTrackingNumber: (prefix: string) => string,
  rng: () => number,
): { result: DeliveryResult | null; session: DeliverySession } | null {
  // Sektakan jika masih dalam cooldown
  if (now < session.cooldownUntil) {
    return null;
  }

  if (!nearbyZone) {
    return null;
  }

  const zone = nearbyZone;

  // Ambil paket
  if (zone.type === "pickup" && !session.hasPacket) {
    const deliveryZones = DELIVERY_ZONES.filter((z) => z.type === "delivery");
    const targetZone = deliveryZones[Math.floor(rng() * deliveryZones.length)];
    const reward = Math.floor(2000 + rng() * 5000);
    const xpReward = 25 + Math.floor(rng() * 25);
    const trackingNumber = createTrackingNumber("MSK");
    const packetId = createId();

    const newSession: DeliverySession = {
      ...session,
      state: "hasPacket",
      packetId,
      trackingNumber,
      targetZone,
      reward,
      xpReward,
      hasPacket: true,
      cooldownUntil: now + 500, // 500ms cooldown selepas ambil
    };

    return {
      result: { action: "pickup", message: `Pilih paket dari ${zone.name}` },
      session: newSession,
    };
  }

  // Hantar paket
  if (zone.type === "delivery" && session.hasPacket && zone.id === session.targetZone?.id) {
    const newSession: DeliverySession = {
      ...session,
      state: "complete",
      hasPacket: false,
      deliveredAt: now,
      cooldownUntil: now + 1000, // 1s cooldown selepas hantar
    };

    return {
      result: {
        action: "deliver",
        message: `Penghantaran selesai! +Rp ${session.reward.toLocaleString("id-ID")} | +${session.xpReward} XP`,
      },
      session: newSession,
    };
  }

  // Zon pickup tetapi sudah ada paket
  if (zone.type === "pickup" && session.hasPacket) {
    return {
      result: { action: "nothing", message: "Anda sudah ada paket. Hantar dulu yang sedia ada." },
      session,
    };
  }

  return {
    result: { action: "nothing", message: "Tiada aktiviti di sini" },
    session,
  };
}

// ── Backward-compatible shim (DEPRECATED) ───────────────────────
//
// Fail komponen yang lain masih mengimport DELIVERY_SYSTEM.
// Shim ini menggunakan Zustand store baharu di bawah siling.
// Kami akan mengemas kini satu-per-satu hingga shim boleh dibuang.

import { useDeliveryStore } from "@/store/delivery";

export const DELIVERY_SYSTEM = {
  getSession: (): DeliverySession => useDeliveryStore.getState().session,
  getZones: (): DeliveryZone[] => DELIVERY_ZONES,
  getPlayerPosition: () => useDeliveryStore.getState().playerPos,
  setPlayerPosition: (pos: { x: number; z: number }) => useDeliveryStore.getState().setPlayerPosition(pos),
  setNearbyZone: (zone: DeliveryZone | null) => useDeliveryStore.getState().setNearbyZone(zone),
  resetSession: () => useDeliveryStore.getState().reset(),
  checkInteract: (): DeliveryResult | null => {
    const store = useDeliveryStore.getState();
    const now = Date.now();
    const result = store.interact(now);
    if (!result || !result.result) return null;
    return result.result;
  },
};
