import type { Packet, PacketHistoryEntry, PacketStatus } from "@/types/game";

/** Allowed next statuses (master prompt section I). Single source of truth. */
export const PACKET_TRANSITIONS: Record<PacketStatus, readonly PacketStatus[]> = {
  incoming: ["received", "cancelled"],
  received: ["sorting"],
  sorting: ["ready_to_dispatch"],
  ready_to_dispatch: ["loaded"],
  loaded: ["in_transit"],
  in_transit: ["out_for_delivery"],
  out_for_delivery: ["delivered", "failed"],
  delivered: ["returned"],
  failed: ["out_for_delivery", "returned"],
  returned: ["sorting"],
  cancelled: [],
};

/** Statuses a packet can end a manifest in. `failed` must be returned first. */
export const TERMINAL_STATUSES: readonly PacketStatus[] = ["delivered", "returned", "cancelled"];

export function canTransition(from: PacketStatus, to: PacketStatus): boolean {
  return PACKET_TRANSITIONS[from].includes(to);
}

/** Required to mark a packet delivered (section I). */
export interface DeliveryProof {
  inOpenManifest: boolean;
  hasHandover: boolean;
}

/**
 * Move a packet to `to`, appending a history entry. Throws on an invalid
 * transition, or on `delivered` without an open manifest and a handover.
 */
export function transition(
  packet: Packet,
  to: PacketStatus,
  reason: string,
  now: number,
  proof?: DeliveryProof,
): Packet {
  if (!canTransition(packet.status, to)) {
    throw new Error(`Peralihan tidak sah: "${packet.status}" → "${to}"`);
  }
  if (to === "delivered" && !(proof?.inOpenManifest && proof.hasHandover)) {
    throw new Error("Paket hanya boleh 'delivered' dalam manifest terbuka dengan serah terima sah");
  }
  const entry: PacketHistoryEntry = { status: to, timestamp: now, reason };
  return { ...packet, status: to, updatedAt: now, history: [...packet.history, entry] };
}

/** Apply several transitions in order with one reason. */
export function advance(packet: Packet, steps: readonly PacketStatus[], reason: string, now: number): Packet {
  return steps.reduce((p, to) => transition(p, to, reason, now), packet);
}

export interface NewPacket {
  id: string;
  trackingNumber: string;
  senderAddress: string;
  receiverName: string;
  receiverAddress: string;
  areaCode: string;
  weight: number;
  volume: number;
  now: number;
}

/** A packet as it arrives at the warehouse: status `received`, with history. */
export function createPacket(p: NewPacket): Packet {
  return {
    id: p.id,
    trackingNumber: p.trackingNumber,
    senderName: "Penghantar",
    receiverName: p.receiverName,
    senderAddress: p.senderAddress,
    receiverAddress: p.receiverAddress,
    areaCode: p.areaCode,
    weight: p.weight,
    dimensions: { length: 20, width: 15, height: 10 },
    volume: p.volume,
    paymentMethod: "prepaid",
    codAmount: 0,
    priority: "normal",
    specialInstructions: "",
    status: "received",
    history: [{ status: "received", timestamp: p.now, reason: "Diterima di gudang" }],
    createdAt: p.now,
    updatedAt: p.now,
  };
}
