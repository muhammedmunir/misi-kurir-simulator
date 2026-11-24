import type { DeliveryResult, DeliverySession, DeliveryZone } from "@/types/delivery";
import { create } from "zustand";

import { DELIVERY_ZONES } from "@/lib/delivery-system";

// ── Type helpers ─────────────────────────────────────────────────

// When interact() returns a result, the session is updated on the
// *next* tick (handled by the component that calls interact()).
// We still need to carry reward / xp back to the game store.
export interface DeliveryActionPayload {
  reward: number;
  xpReward: number;
  trackingNumber: string | null;
  session: DeliverySession;
}

// ── Factory ──────────────────────────────────────────────────────

export function createDeliverySession(): DeliverySession {
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

// ── Zustand store ───────────────────────────────────────────────

interface DeliveryStore {
  session: DeliverySession;
  // Exposed zones (read-only reference)
  zones: DeliveryZone[];

  // ── Mutation helpers ────────────────────────────────────────
  setSession: (s: DeliverySession) => void;
  tick: (now: number) => void;
  // Call from the player component when the user presses E.
  // Returns the result (and a payload with the new session + reward/xp)
  // or null if blocked.
  interact: (now: number) => { result: DeliveryResult | null; payload: DeliveryActionPayload | null };

  // ── Position ────────────────────────────────────────────────
  playerPos: { x: number; z: number } | null;
  setPlayerPosition: (pos: { x: number; z: number }) => void;

  // ── Zone detection (caller must compute distance) ───────────
  setNearbyZone: (zone: DeliveryZone | null) => void;

  // ── Reset ───────────────────────────────────────────────────
  reset: () => void;
}

let _idCounter = 0;
function genId(): string {
  return `del-${++_idCounter}`;
}

function genTrackingNumber(prefix = "MSK"): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `${prefix}-${timestamp}-${random}`;
}

export const useDeliveryStore = create<DeliveryStore>((set, get) => ({
  session: createDeliverySession(),
  zones: DELIVERY_ZONES,

  setSession: (session) => set({ session }),

  tick: (now: number) => {
    const s = get().session;
    const next: DeliverySession = { ...s };

    // Auto-reset from complete → idle
    if (next.state === "complete" && next.deliveredAt != null && now - next.deliveredAt >= 5000) {
      next.state = "idle";
      next.targetZone = null;
      next.reward = 0;
      next.xpReward = 0;
      next.deliveredAt = null;
    }

    set({ session: next });
  },

  interact: (now: number) => {
    const s = get().session;
    const zone = get().session.nearbyZone;

    // On cooldown → block
    if (now < s.cooldownUntil) {
      return { result: null, payload: null };
    }

    if (!zone) {
      return { result: null, payload: null };
    }

    // Pick up
    if (zone.type === "pickup" && !s.hasPacket) {
      const deliveryZones = DELIVERY_ZONES.filter((z) => z.type === "delivery");
      const targetZone = deliveryZones[Math.floor(Math.random() * deliveryZones.length)];
      const reward = Math.floor(2000 + Math.random() * 5000);
      const xpReward = 25 + Math.floor(Math.random() * 25);
      const trackingNumber = genTrackingNumber("MSK");
      const message = `Pilih paket dari ${zone.name}`;

      const newSession: DeliverySession = {
        ...s,
        state: "hasPacket",
        packetId: genId(),
        trackingNumber,
        targetZone,
        reward,
        xpReward,
        hasPacket: true,
        cooldownUntil: now + 500,
      };
      set({ session: newSession });

      return {
        result: { action: "pickup", message },
        payload: { reward, xpReward, trackingNumber, session: newSession },
      };
    }

    // Deliver
    if (zone.type === "delivery" && s.hasPacket && zone.id === s.targetZone?.id) {
      const reward = s.reward;
      const xpReward = s.xpReward;
      const trackingNumber = s.trackingNumber;
      const message = `Penghantaran selesai! +Rp ${reward.toLocaleString("id-ID")} | +${xpReward} XP`;

      const newSession: DeliverySession = {
        ...s,
        state: "complete",
        hasPacket: false,
        deliveredAt: now,
        cooldownUntil: now + 1000,
      };
      set({ session: newSession });

      return {
        result: { action: "deliver", message },
        payload: { reward, xpReward, trackingNumber, session: newSession },
      };
    }

    // Zone exists but no valid action (block motor swap)
    if (zone.type === "pickup" && s.hasPacket) {
      return {
        result: { action: "nothing", message: "Anda sudah ada paket. Hantar dulu yang sedia ada." },
        payload: null,
      };
    }

    return {
      result: { action: "nothing", message: "Tiada aktiviti di sini" },
      payload: null,
    };
  },

  playerPos: null,
  setPlayerPosition: (pos) => set({ playerPos: pos }),

  setNearbyZone: (zone) => {
    set((s) => ({ session: { ...s.session, nearbyZone: zone } }));
  },

  reset: () => {
    set({ session: createDeliverySession() });
  },
}));

// ── Backwards-compatible adapter ─────────────────────────────────

// The old DELIVERY_SYSTEM API is still used by a few components.
// We keep a thin shim so the existing import pattern works during
// this transition phase.  It delegates to the Zustand store.

const DELIVERY_SYSTEM = {
  getSession: () => useDeliveryStore.getState().session,
  getZones: () => DELIVERY_ZONES,
  getPlayerPosition: () => useDeliveryStore.getState().playerPos,
  setPlayerPosition: (pos: { x: number; z: number }) => useDeliveryStore.getState().setPlayerPosition(pos),
  setNearbyZone: (zone: DeliveryZone | null) => useDeliveryStore.getState().setNearbyZone(zone),
  resetSession: () => useDeliveryStore.getState().reset(),
  // checkInteract is replaced by tick() + interact() but we keep it:
  checkInteract: (): DeliveryResult | null => {
    const s = useDeliveryStore.getState().session;
    if (s.cooldownUntil > Date.now()) return null;
    if (!s.nearbyZone) return null;
    const zone = s.nearbyZone;
    if (zone.type === "pickup" && !s.hasPacket) {
      return { action: "pickup", message: `Pilih paket dari ${zone.name}` };
    }
    if (zone.type === "delivery" && s.hasPacket && zone.id === s.targetZone?.id) {
      return {
        action: "deliver",
        message: `Penghantaran selesai! +Rp ${s.reward.toLocaleString("id-ID")} | +${s.xpReward} XP`,
      };
    }
    if (zone.type === "pickup" && s.hasPacket) {
      return { action: "nothing", message: "Anda sudah ada paket. Hantar dulu yang sedia ada." };
    }
    return { action: "nothing", message: "Tiada aktiviti di sini" };
  },
};

// Re-export for backwards compatibility
export { DELIVERY_SYSTEM };
