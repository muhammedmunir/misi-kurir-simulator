import type { Packet, PacketHistoryEntry, PacketStatus } from "@/types/game";

/**
 * Valid peralihan dari setiap status — padanan dengan PACKET_STATUS_FLOW
 * dalam types/game.ts. Dijaga selari secara manual.
 */
export const PACKET_TRANSITIONS: Record<PacketStatus, PacketStatus[]> = {
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

/**
 * Semak jika peralihan sah tanpa mengubah paket.
 * Padanan langsung dengan canTransition() dalam types/game.ts.
 */
export function canTransition(from: PacketStatus, to: PacketStatus): boolean {
  const next = PACKET_TRANSITIONS[from];
  if (!next) return false;
  return next.includes(to);
}

/**
 * Pindahkan paket ke status baharu.
 * @returns Paket baharu (immutable) dengan entri history ditambah.
 * @throws Ralat jika peralihan tidak sah.
 *
 * Peraturan Seksyen I: "delivered" hanya dibenarkan jika
 * hasManifest === true && hasHandover === true.
 */
export function transition(
  packet: Packet,
  to: PacketStatus,
  reason: string,
  now: number,
  ctx?: { hasManifest?: boolean; hasHandover?: boolean },
): Packet {
  if (to === "delivered") {
    if (ctx && (!ctx.hasManifest || !ctx.hasHandover)) {
      throw new Error("Paket boleh dihantar hanya jika dalam manifest open DAN ada rekod serah terima sah");
    }
  }

  const next = PACKET_TRANSITIONS[packet.status];
  if (!next) {
    throw new Error(`Tiada peralihan dari status "${packet.status}"`);
  }

  if (!next.includes(to)) {
    throw new Error(`Peralihan tidak sah: "${packet.status}" → "${to}"`);
  }

  const entry: PacketHistoryEntry = {
    status: to,
    timestamp: now,
    reason,
  };

  return {
    ...packet,
    status: to,
    updatedAt: now,
    history: [...packet.history, entry],
  };
}
