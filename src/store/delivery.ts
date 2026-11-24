import {
  DELIVERY_ZONES,
  STARTER_CARGO,
  createSession,
  interact as interactPure,
  tickSession,
} from "@/lib/delivery-system";
import { useGameStateStore } from "@/store/gamestate";
import type { DeliveryResult, DeliverySession, DeliveryZone } from "@/types/delivery";
import { type Deps, dispatch, loadOntoVehicle, scanPacket } from "@/warehouse/warehouse-logic";
import { create } from "zustand";

let idCounter = 0;
function genId(): string {
  idCounter += 1;
  return `del-${Date.now().toString(36)}-${idCounter}`;
}

function genTrackingNumber(prefix = "MSK"): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `${prefix}-${timestamp}-${random}`;
}

const runtimeDeps: Deps = { createId: genId, createTrackingNumber: genTrackingNumber, rng: Math.random };

interface DeliveryStore {
  session: DeliverySession;
  zones: DeliveryZone[];
  /** Injected so tests can make ids/randomness deterministic. */
  deps: Deps;

  tick: (now: number) => void;
  /** E key / action button. Applies the reward to the player on "deliver". */
  interact: (now: number) => { result: DeliveryResult | null };

  // Warehouse panel
  scan: (packetId: string, now: number) => void;
  load: (packetId: string, now: number) => void;
  dispatch: (now: number) => void;
  closePanel: () => void;

  playerPos: { x: number; z: number } | null;
  setPlayerPosition: (pos: { x: number; z: number }) => void;
  setNearbyZone: (zone: DeliveryZone | null) => void;
  reset: () => void;
}

const TICK_KEYS = [
  "phase",
  "manifest",
  "cargo",
  "targets",
  "cooldownUntil",
  "completedAt",
  "completeMessage",
  "interactionMessage",
] as const;

export const useDeliveryStore = create<DeliveryStore>((set, get) => {
  /** Apply a warehouse outcome, or show its error as the interaction message. */
  const apply = (outcome: { ok: true; session: DeliverySession } | { ok: false; error: string }, now: number) => {
    if (outcome.ok) {
      set({ session: outcome.session });
    } else {
      set({ session: { ...get().session, interactionMessage: outcome.error, interactionMessageTime: now } });
    }
  };

  return {
    session: createSession(),
    zones: DELIVERY_ZONES,
    deps: runtimeDeps,

    tick: (now) => {
      const session = get().session;
      const next = tickSession(session, now);
      // Only notify subscribers when something visible changed.
      if (TICK_KEYS.some((k) => next[k] !== session[k])) set({ session: next });
    },

    interact: (now) => {
      const s = get().session;
      if (!s.nearbyZone) return { result: null };
      const { result, session } = interactPure(s, s.nearbyZone, now, get().deps);
      set({ session });
      if (result.action === "deliver") {
        useGameStateStore.getState().addMoney(result.reward ?? 0);
        useGameStateStore.getState().addXP(result.xpReward ?? 0);
      }
      return { result };
    },

    scan: (packetId, now) => apply(scanPacket(get().session, packetId, now), now),
    load: (packetId, now) =>
      apply(loadOntoVehicle(get().session, packetId, STARTER_CARGO, get().deps.createId, now), now),
    dispatch: (now) => apply(dispatch(get().session, now), now),
    closePanel: () => set({ session: { ...get().session, panelOpen: false } }),

    playerPos: null,
    setPlayerPosition: (pos) => set({ playerPos: pos }),

    setNearbyZone: (zone) => {
      const s = get().session;
      if (s.nearbyZone?.id === zone?.id) return;
      // Walking away from the desk closes the warehouse panel.
      const panelOpen = s.panelOpen && zone?.type === "pickup";
      set({ session: { ...s, nearbyZone: zone, panelOpen } });
    },

    reset: () => set({ session: createSession() }),
  };
});
