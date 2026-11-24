import type { Manifest, Packet } from "@/types/game";

// ── Delivery Zone ────────────────────────────────────────────────

export interface DeliveryZone {
  id: string;
  name: string;
  type: "pickup" | "delivery";
  position: { x: number; z: number };
  areaCode: string;
  description: string;
  interactable?: boolean;
}

// ── Delivery Session ─────────────────────────────────────────────

export interface DeliverySession {
  state: "idle" | "atPickup" | "carrying" | "atDelivery" | "complete";
  packet: Packet | null;
  manifest: Manifest | null;
  targetZone: DeliveryZone | null;
  reward: number;
  xpReward: number;
  nearbyZone: DeliveryZone | null;
  cooldownUntil: number;
  deliveredAt: number | null;
  // UI message fields
  completeMessage: string | null;
  completeMessageTime: number | null;
  interactionMessage: string | null;
  interactionMessageTime: number | null;
}

export interface DeliveryResult {
  action: "pickup" | "deliver" | "nothing" | "blocked";
  message: string;
  reward?: number; // MYR ganjaran (hanya pada pickup/deliver)
  xpReward?: number;
}
