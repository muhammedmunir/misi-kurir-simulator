import type { Manifest, Packet } from "@/types/game";
import type { ParkingCheck, Rect } from "@/vehicles/motor-state";

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
  /** Centre of the block this address occupies (no random building is placed there). */
  lot?: { x: number; z: number };
  /** Parking box on the road in front of the address. */
  parking?: Rect;
  /** false = industrial zone with no one at home. */
  receiverHome?: boolean;
}

// ── Delivery Session ─────────────────────────────────────────────

/**
 * idle       — no manifest; packets wait at the warehouse
 * loading    — manifest open, loading packets onto the vehicle
 * delivering — dispatched; cargo is out for delivery
 * returning  — some packets failed, must return to warehouse
 * complete   — manifest closed, summary shown to player (stays until acknowledged)
 */
export type DeliveryPhase = "idle" | "loading" | "delivering" | "returning" | "complete";

export interface DeliveryHandover {
  /** packetId in cargo that needs handover. */
  packetId: string;
  /** Zone id where the rider is standing. */
  zoneId: string;
  /** Proof photo taken by the rider. */
  proofTaken: boolean;
  /** COD collected from the receiver (COD packets only). */
  codCollected?: boolean;
}

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
  /** Where the motor was last left. Kept for reputation later (no penalty yet). */
  lastParking: ParkingCheck | null;
  /** When the manifest was completed (for auto-reset). */
  completedAt: number | null;
  completeMessage: string | null;
  completeMessageTime: number | null;
  interactionMessage: string | null;
  interactionMessageTime: number | null;
  /** Active handover workflow at current zone. */
  handover: DeliveryHandover | null;
  /** Accumulated reward/XP for the current manifest. */
  tally: { earned: number; xp: number };
  /** Manifest performance snapshot, shown after closing. */
  summary: ManifestSummary | null;
}

export type DeliveryAction =
  | "open_warehouse"
  | "deliver"
  | "nothing"
  | "blocked"
  | "open_handover"
  | "return_packets"
  | "close_manifest";

export interface DeliveryResult {
  action: DeliveryAction;
  message: string;
  /** RM, only on "deliver". */
  reward?: number;
  xpReward?: number;
}

/** Snapshot of a manifest's performance, produced when the manifest is closed. */
export interface ManifestSummary {
  manifestId: string | undefined;
  delivered: number;
  returned: number;
  earned: number;
  xp: number;
  /** Total COD cash deposited to the warehouse when the manifest closed. */
  codCollected: number;
  durationMs: number;
}
