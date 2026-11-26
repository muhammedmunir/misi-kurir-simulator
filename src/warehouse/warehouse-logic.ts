import { type CargoLimits, createManifest, loadPacket } from "@/delivery/manifest";
import { advance, createPacket } from "@/delivery/packet";
import type { DeliverySession, DeliveryZone } from "@/types/delivery";
import type { Packet } from "@/types/game";

export interface Deps {
  createId: () => string;
  createTrackingNumber: (prefix: string) => string;
  rng: () => number;
}

const RECEIVER_NAMES = ["Aminah", "Rajesh", "Mei Ling", "Hafiz", "Siti", "Kumar", "Farah", "Wei Jie"];

/** Warehouse building footprint (world units). Door faces -z (towards the z=0 road). */
export const WAREHOUSE = {
  center: { x: 20, z: 20 },
  width: 20,
  depth: 14,
  doorWidth: 6,
} as const;

/** New arrivals at the warehouse, each addressed to one of `destinations`. */
export function generateInbound(
  count: number,
  destinations: readonly DeliveryZone[],
  senderAddress: string,
  deps: Deps,
  now: number,
): { packets: Packet[]; targets: Record<string, string> } {
  const packets: Packet[] = [];
  const targets: Record<string, string> = {};
  for (let i = 0; i < count; i++) {
    const dest = destinations[Math.floor(deps.rng() * destinations.length)];
    const receiverName = RECEIVER_NAMES[Math.floor(deps.rng() * RECEIVER_NAMES.length)];
    const weight = Math.round((0.5 + deps.rng() * 4.5) * 10) / 10;
    const volume = 2 + Math.floor(deps.rng() * 5);
    // ~40% paket adalah COD; jumlah RM10.00–RM95.50 dalam gandaan 50 sen.
    // Turutan gulungan rng adalah kontrak: destinasi, penerima, berat, isi padu, COD?, jumlah.
    const isCod = deps.rng() < 0.4;
    const codAmount = isCod ? 10 + Math.floor(deps.rng() * 172) * 0.5 : 0;
    const p = createPacket({
      id: deps.createId(),
      trackingNumber: deps.createTrackingNumber("MSK"),
      senderAddress,
      receiverName,
      receiverAddress: dest.name,
      areaCode: dest.areaCode,
      weight,
      volume,
      paymentMethod: isCod ? "cod" : "prepaid",
      codAmount,
      now,
    });
    packets.push(p);
    targets[p.id] = dest.id;
  }
  return { packets, targets };
}

type Outcome = { ok: true; session: DeliverySession } | { ok: false; error: string };

const canEditLoad = (s: DeliverySession) => s.phase === "idle" || s.phase === "loading";

/** Simulated barcode scan: received → sorting → ready_to_dispatch. */
export function scanPacket(s: DeliverySession, packetId: string, now: number): Outcome {
  const p = s.inbound.find((x) => x.id === packetId);
  if (!p) return { ok: false, error: "Paket tiada di gudang" };
  if (p.status !== "received") return { ok: false, error: "Paket sudah diimbas" };
  const ready = advance(p, ["sorting", "ready_to_dispatch"], "Diimbas dan disortir", now);
  return { ok: true, session: { ...s, inbound: s.inbound.map((x) => (x.id === packetId ? ready : x)) } };
}

const LOAD_ERRORS: Record<string, string> = {
  not_ready: "Imbas paket dahulu",
  over_weight: "Melebihi had berat motor",
  over_volume: "Tiada ruang dalam kotak motor",
  already_loaded: "Paket sudah dimuat",
  manifest_closed: "Manifest sudah ditutup",
};

/** Load one scanned packet; opens a manifest on the first load. */
export function loadOntoVehicle(
  s: DeliverySession,
  packetId: string,
  limits: CargoLimits,
  createId: () => string,
  now: number,
): Outcome {
  if (!canEditLoad(s)) return { ok: false, error: "Tidak boleh memuat semasa penghantaran" };
  const p = s.inbound.find((x) => x.id === packetId);
  if (!p) return { ok: false, error: "Paket tiada di gudang" };
  const manifest = s.manifest ?? createManifest(createId(), now);
  const r = loadPacket(manifest, p, limits, now);
  if (!r.ok) return { ok: false, error: LOAD_ERRORS[r.error] };
  return {
    ok: true,
    session: {
      ...s,
      phase: "loading",
      manifest: r.manifest,
      inbound: s.inbound.filter((x) => x.id !== packetId),
      cargo: [...s.cargo, r.packet],
    },
  };
}

/** Leave the warehouse: every loaded packet goes out for delivery. */
export function dispatch(s: DeliverySession, now: number): Outcome {
  if (s.phase !== "loading" || s.cargo.length === 0) return { ok: false, error: "Muat sekurang-kurangnya satu paket" };
  const cargo = s.cargo.map((p) => advance(p, ["in_transit", "out_for_delivery"], "Keluar untuk penghantaran", now));
  return { ok: true, session: { ...s, phase: "delivering", cargo, panelOpen: false } };
}

/** Cargo load against limits, for the "2/3 paket, 4.1/15 kg" indicator. */
export function cargoUsage(s: DeliverySession, limits: CargoLimits) {
  return {
    packets: s.cargo.length,
    weight: Math.round((s.manifest?.totalWeight ?? 0) * 10) / 10,
    maxWeight: limits.maxWeight,
    volume: s.manifest?.totalVolume ?? 0,
    maxVolume: limits.maxVolume,
  };
}
