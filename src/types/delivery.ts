import type { Manifest, Packet } from "@/types/game";

// ── Delivery Zone ────────────────────────────────────────────────

export interface DeliveryZone {
  id: string;
  name: string;
  /** "pickup" = warehouse sorting desk; "delivery" = customer address. */
  type: "pickup" | "delivery";
  position: { x: number; z: number };
  areaCode: string;
  description: string;
  interactable?: boolean;
}

// ── Delivery Session ─────────────────────────────────────────────

/**
 * idle       — no manifest; packets wait at the warehouse
 * loading    — manifest open, loading packets onto the vehicle
 * delivering — dispatched; cargo is out for delivery
 * complete   — every cargo packet resolved, manifest closed (auto-resets to idle)
 */
export type DeliveryPhase = "idle" | "loading" | "delivering" | "complete";

export interface DeliverySession {
  phase: DeliveryPhase;
  /** Packets at the warehouse: received / sorting / ready_to_dispatch. */
  inbound: Packet[];
  manifest: Manifest | null;
  /** Packets in the manifest: loaded → out_for_delivery → delivered. */
  cargo: Packet[];
  /** packetId → delivery zone id. */
  targets: Record<string, string>;
  /** Warehouse panel visible. */
  panelOpen: boolean;
  nearbyZone: DeliveryZone | null;
  cooldownUntil: number;
  /** When the manifest was completed (for auto-reset). */
  completedAt: number | null;
  completeMessage: string | null;
  completeMessageTime: number | null;
  interactionMessage: string | null;
  interactionMessageTime: number | null;
}

export type DeliveryAction = "open_warehouse" | "deliver" | "nothing" | "blocked";

export interface DeliveryResult {
  action: DeliveryAction;
  message: string;
  /** RM, only on "deliver". */
  reward?: number;
  xpReward?: number;
}
