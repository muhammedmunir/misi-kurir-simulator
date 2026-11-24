export interface DeliveryZone {
  id: string;
  name: string;
  type: "pickup" | "delivery";
  position: { x: number; z: number };
  areaCode: string;
  description: string;
  interactable?: boolean;
}

export interface DeliverySession {
  state: "idle" | "hasPacket" | "enRoute" | "arrived" | "complete";
  packetId: string | null;
  trackingNumber: string | null;
  targetZone: DeliveryZone | null;
  reward: number;
  xpReward: number;
  hasPacket: boolean;
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
}
