import type { Manifest, Packet } from "@/types/game";

export type ManifestStatus = Manifest["status"];

/** Simulasi muat paket ke dalam kenderaan.
 *
 * Peraturan: setiap paket perlu ruang fizikal dalam unit isipadu
 * (unit) DAN berat (kg). Jika salah satu melebihi baki kenderaan,
 * paket itu tidak boleh dimuat.
 */
export function createManifest(
  packetIds: string[],
  packets: Record<string, Packet>,
  vehicleCargoCapacity: number, // unit isipadu
  vehicleCargoWeight: number, // kg
): Manifest | { error: string } {
  let weight = 0;
  let volume = 0;
  const loadable: string[] = [];

  for (const id of packetIds) {
    const p = packets[id];
    if (!p) return { error: `Paket ${id} tidak ditemui` };

    const w = p.weight;
    const v = p.volume;
    if (weight + w > vehicleCargoWeight) {
      break; // baki berat tidak mencukupi
    }
    if (volume + v > vehicleCargoCapacity) {
      break; // baki isipadu tidak mencukupi
    }
    weight += w;
    volume += v;
    loadable.push(id);
  }

  return {
    id: "", // diisi oleh caller
    date: new Date().toISOString().split("T")[0],
    packets: loadable,
    totalPackets: loadable.length,
    totalWeight: weight,
    totalVolume: volume,
    codTotal: 0,
    status: "open",
    createdAt: Date.now(),
    closedAt: null,
  };
}

/**
 * Tutup manifest. Semua paket mesti dalam status terminal (delivered/failed/returned/cancelled).
 */
export function closeManifest(manifest: Manifest): Manifest | { error: string } {
  if (manifest.status === "closed" || manifest.status === "archived") {
    return { error: "Manifest sudah ditutup" };
  }

  return { ...manifest, status: "closed", closedAt: Date.now() };
}

/**
 * Semak jika paket masih dibawa dalam manifest yang masih terbuka.
 * Tiada paket di luar manifest boleh status "delivered".
 */
export function isCarrying(manifest: Manifest, packetId: string): boolean {
  return manifest.status === "open" && manifest.packets.includes(packetId);
}

/**
 * Buang paket dari manifest apabila ia sampai ke status terminal.
 */
export function removeFromManifest(manifest: Manifest, packetId: string): Manifest {
  return {
    ...manifest,
    packets: manifest.packets.filter((id) => id !== packetId),
    closedAt: null,
    status: manifest.packets.filter((id) => id !== packetId).length === 0 ? "closed" : "open",
  };
}

/**
 * Is paket ini boleh dihantar? Perlu manifest open + status sesuai.
 */
export function canDeliver(manifest: Manifest | null, packet: Packet, hasHandover: boolean): boolean {
  if (!manifest || manifest.status !== "open") return false;
  if (manifest.packets.includes(packet.id) === false) return false;
  if (hasHandover === false) return false;
  return true;
}
