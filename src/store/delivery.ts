import { stowCarry as stowCarryPure, takeFromMotor as takeFromMotorPure } from "@/delivery/carry";
import { collectCod as collectCodPure } from "@/delivery/cod";
import { completeHandover, failHandover, takeProof as takeProofPure } from "@/delivery/handover";
import { acknowledgeSummary as acknowledgeSummaryPure } from "@/lib/delivery-system";
import {
  DELIVERY_ZONES,
  STARTER_CARGO,
  createSession,
  interact as interactPure,
  tickSession,
} from "@/lib/delivery-system";
import { useGameStateStore } from "@/store/gamestate";
import type { DeliveryResult, DeliverySession, DeliveryZone } from "@/types/delivery";
import type { ParkingCheck } from "@/vehicles/motor-state";
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
  /** E key / action button. Applies the reward to the player on "deliver". Accepts optional onFoot context. */
  interact: (now: number, ctx?: { onFoot: boolean }) => { result: DeliveryResult | null };

  // Warehouse panel
  scan: (packetId: string, now: number) => void;
  load: (packetId: string, now: number) => void;
  dispatch: (now: number) => void;
  closePanel: () => void;

  /** Show a short message in the HUD / panel. */
  notify: (message: string, now: number) => void;
  /** Called when the rider gets off the motor. */
  recordParking: (check: ParkingCheck, now: number) => void;

  playerPos: { x: number; z: number } | null;
  setPlayerPosition: (pos: { x: number; z: number }) => void;
  setNearbyZone: (zone: DeliveryZone | null) => void;
  reset: () => void;

  // Handover workflow
  takeProof: () => void;
  /** Letak barang di tangan ke dalam motor. */
  stowCarry: (now: number) => void;
  /** Ambil paket untuk alamat berdekatan dari motor di `motor`. */
  takeFromMotor: (motor: { x: number; z: number }, now: number) => void;
  /** Collect COD cash for the active handover. Does NOT add money to the player. */
  collectCod: (change: number, now: number) => void;
  confirmHandover: (now: number) => void;
  reportAbsent: (now: number) => void;
  cancelHandover: () => void;
  /** Acknowledge manifest summary and return to idle. */
  acknowledgeSummary: () => void;
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

    interact: (now, ctx) => {
      const s = get().session;
      if (!s.nearbyZone) return { result: null };
      const { result, session } = interactPure(s, s.nearbyZone, now, get().deps, ctx);
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

    notify: (message, now) =>
      set({ session: { ...get().session, interactionMessage: message, interactionMessageTime: now } }),

    recordParking: (check, now) => {
      const s = { ...get().session, lastParking: check };
      if (check.zoneId) {
        s.interactionMessage = check.proper ? "Motor diparkir dalam kotak" : "Motor di luar kotak parkir";
        s.interactionMessageTime = now;
      }
      set({ session: s });
    },

    playerPos: null,
    setPlayerPosition: (pos) => set({ playerPos: pos }),

    setNearbyZone: (zone) => {
      const s = get().session;
      if (s.nearbyZone?.id === zone?.id) return;
      // Walking away from the desk closes the warehouse panel.
      const panelOpen = s.panelOpen && zone?.type === "pickup";
      // Walking away from a delivery zone closes the handover workflow.
      let handover = s.handover;
      if (s.nearbyZone?.type === "delivery" && zone?.type !== "delivery") {
        handover = null;
      }
      set({ session: { ...s, nearbyZone: zone, panelOpen, handover } });
    },

    reset: () => set({ session: createSession() }),

    // Handover workflow
    takeProof: () => {
      set({ session: takeProofPure(get().session, Date.now()) });
    },
    stowCarry: (now) => set({ session: stowCarryPure(get().session, now) }),
    takeFromMotor: (motor, now) => set({ session: takeFromMotorPure(get().session, motor, now) }),
    collectCod: (change, now) => {
      set({ session: collectCodPure(get().session, change, now) });
    },
    confirmHandover: (now) => {
      const { result, session } = completeHandover(get().session, now, get().deps);
      if (result.action === "deliver") {
        useGameStateStore.getState().addMoney(result.reward ?? 0);
        useGameStateStore.getState().addXP(result.xpReward ?? 0);
      }
      set({ session });
    },
    reportAbsent: (now) => {
      const s = get().session;
      const h = s.handover;
      if (!h) return;
      // Reject confirm (no proof, no receiverHome=false); fall through to failHandover
      const failed = failHandover(s, now);
      set({
        session: {
          ...failed,
          handover: null,
          interactionMessage: "Penerima tiada di rumah",
          interactionMessageTime: now,
        },
      });
    },
    cancelHandover: () => {
      set((s) => ({ session: { ...s.session, handover: null } }));
    },

    acknowledgeSummary: () => {
      set({ session: acknowledgeSummaryPure(get().session) });
    },
  };
});
