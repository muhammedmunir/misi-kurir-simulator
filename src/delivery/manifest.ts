import type { Manifest, Packet } from "@/types/game";
import { TERMINAL_STATUSES, transition } from "./packet";

export interface CargoLimits {
  /** Volume units (Vehicle.specs.cargoCapacity). */
  maxVolume: number;
  /** Kilograms (Vehicle.specs.cargoWeight). */
  maxWeight: number;
}

export function createManifest(id: string, now: number): Manifest {
  return {
    id,
    date: new Date(now).toISOString().slice(0, 10),
    packets: [],
    totalPackets: 0,
    totalWeight: 0,
    totalVolume: 0,
    codTotal: 0,
    status: "open",
    createdAt: now,
    closedAt: null,
  };
}

export type LoadError = "manifest_closed" | "not_ready" | "already_loaded" | "over_weight" | "over_volume";

export type LoadResult = { ok: true; manifest: Manifest; packet: Packet } | { ok: false; error: LoadError };

/**
 * Load one `ready_to_dispatch` packet onto the vehicle (section H.3).
 * A packet that does not fit is rejected and stays unloaded.
 */
export function loadPacket(manifest: Manifest, packet: Packet, limits: CargoLimits, now: number): LoadResult {
  if (manifest.status !== "open") return { ok: false, error: "manifest_closed" };
  if (manifest.packets.includes(packet.id)) return { ok: false, error: "already_loaded" };
  if (packet.status !== "ready_to_dispatch") return { ok: false, error: "not_ready" };
  if (manifest.totalWeight + packet.weight > limits.maxWeight) return { ok: false, error: "over_weight" };
  if (manifest.totalVolume + packet.volume > limits.maxVolume) return { ok: false, error: "over_volume" };

  return {
    ok: true,
    packet: transition(packet, "loaded", "Dimuat ke kenderaan", now),
    manifest: {
      ...manifest,
      packets: [...manifest.packets, packet.id],
      totalPackets: manifest.totalPackets + 1,
      totalWeight: manifest.totalWeight + packet.weight,
      totalVolume: manifest.totalVolume + packet.volume,
      codTotal: manifest.codTotal + packet.codAmount,
    },
  };
}

export function isCarrying(manifest: Manifest | null, packetId: string): boolean {
  return manifest !== null && manifest.status === "open" && manifest.packets.includes(packetId);
}

export type CloseResult = { ok: true; manifest: Manifest } | { ok: false; error: "already_closed" | "unresolved" };

/** Close only when every listed packet is delivered, returned or cancelled. */
export function closeManifest(manifest: Manifest, packets: readonly Packet[], now: number): CloseResult {
  if (manifest.status !== "open") return { ok: false, error: "already_closed" };
  const byId = new Map(packets.map((p) => [p.id, p]));
  const resolved = manifest.packets.every((id) => {
    const p = byId.get(id);
    return p !== undefined && TERMINAL_STATUSES.includes(p.status);
  });
  if (!resolved) return { ok: false, error: "unresolved" };
  return { ok: true, manifest: { ...manifest, status: "closed", closedAt: now } };
}
