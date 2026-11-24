import type { DeliveryResult, DeliverySession, DeliveryZone } from "@/types/delivery";
import { create } from "zustand";

import { DELIVERY_ZONES, createSession, interact as interactPure, tickSession } from "@/lib/delivery-system";
import { useGameStateStore } from "@/store/gamestate";

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

// ── ID / RNG factories ──────────────────────────────────────────

let _idCounter = 0;
function genId(): string {
  return `del-${++_idCounter}`;
}

// ── Mutation helpers ────────────────────────────────────────────

function genTrackingNumber(prefix = "MSK"): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `${prefix}-${timestamp}-${random}`;
}

// ── Zustand store ───────────────────────────────────────────────

interface DeliveryStore {
  session: DeliverySession;
  // Exposed zones (read-only reference)
  zones: DeliveryZone[];

  // ── Mutation helpers ────────────────────────────────────────
  tick: (now: number) => void;
  interact: (now: number) => { result: DeliveryResult | null; payload: DeliveryActionPayload | null };

  // ── Position ────────────────────────────────────────────────
  playerPos: { x: number; z: number } | null;
  setPlayerPosition: (pos: { x: number; z: number }) => void;

  // ── Zone detection (caller must compute distance) ───────────
  setNearbyZone: (zone: DeliveryZone | null) => void;

  // ── Reset ───────────────────────────────────────────────────
  reset: () => void;
}

export const useDeliveryStore = create<DeliveryStore>((set, get) => ({
  session: createSession(),
  zones: DELIVERY_ZONES,

  tick: (now: number) => {
    const session = get().session;
    // Skip set() if no change — avoids unnecessary re-renders
    const next = tickSession(session, now);
    if (next === session || Object.is(next, session)) return;
    // Check if anything actually changed
    const keys = [
      "state",
      "targetZone",
      "reward",
      "xpReward",
      "deliveredAt",
      "cooldownUntil",
      "completeMessage",
      "completeMessageTime",
      "interactionMessage",
      "interactionMessageTime",
    ] as const;
    let changed = false;
    for (const k of keys) {
      if (next[k] !== session[k]) {
        changed = true;
        break;
      }
    }
    if (!changed) return;
    set({ session: next });
  },

  interact: (now: number) => {
    const s = get().session;
    const zone = s.nearbyZone;

    // No zone → nothing
    if (!zone) {
      return { result: null, payload: null };
    }

    // Inject dependencies into the pure interact function
    const rngFn = () => Math.random();
    const result = interactPure(s, zone, now, genId, genTrackingNumber, rngFn);

    // Always apply the new session (messages, cooldown, etc.)
    set({ session: result.session });

    // "blocked" means cooldown active — still return result so UI shows message
    // but caller should NOT allow motor swap (handled in PlayerController)
    if (result.result.action === "pickup") {
      return {
        result: { action: "pickup", message: result.result.message },
        payload: {
          reward: result.session.reward,
          xpReward: result.session.xpReward,
          trackingNumber: result.session.trackingNumber,
          session: result.session,
        },
      };
    }

    if (result.result.action === "deliver") {
      // Berikan ganjaran kepada game store
      useGameStateStore.getState().addMoney(result.session.reward);
      useGameStateStore.getState().addXP(result.session.xpReward);
      return {
        result: { action: "deliver", message: result.result.message },
        payload: {
          reward: result.session.reward,
          xpReward: result.session.xpReward,
          trackingNumber: result.session.trackingNumber,
          session: result.session,
        },
      };
    }

    // "nothing" or "blocked" → return result so UI shows message
    return { result: result.result, payload: null };
  },

  playerPos: null,
  setPlayerPosition: (pos) => set({ playerPos: pos }),

  setNearbyZone: (zone) => {
    set((s) => ({ session: { ...s.session, nearbyZone: zone } }));
  },

  reset: () => {
    set({ session: createSession() });
  },
}));
