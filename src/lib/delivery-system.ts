import { rollDeliveryReward } from "@/data/economy";
import { formatRinggit } from "@/lib/utils";
import type { DeliveryResult, DeliverySession, DeliveryZone } from "@/types/delivery";
import type { Manifest, Packet, PacketStatus } from "@/types/game";

// ── Zone Data ─────────────────────────────────────────────────────

export const DELIVERY_ZONES: DeliveryZone[] = [
  {
    id: "zone-pickup-1",
    name: "Pejabat Pos Pusat",
    type: "pickup",
    position: { x: 0, z: 0 },
    areaCode: "bandar",
    description: "Balik pos untuk penghantaran pertama",
    interactable: true,
  },
  {
    id: "zone-delivery-1",
    name: "Kedai Runcit Mak Amin",
    type: "delivery",
    position: { x: 40, z: 40 },
    areaCode: "perumahan",
    description: "Penghantaran ke kedai runcit",
    interactable: true,
  },
  {
    id: "zone-delivery-2",
    name: "Kafe Kampung Digital",
    type: "delivery",
    position: { x: -40, z: -40 },
    areaCode: "pasar",
    description: "Penghantaran ke kafe tempatan",
    interactable: true,
  },
  {
    id: "zone-delivery-3",
    name: "Pusat Industri Timur",
    type: "delivery",
    position: { x: 80, z: -40 },
    areaCode: "industri",
    description: "Penghantaran kargo industri",
    interactable: true,
  },
  {
    id: "zone-pickup-2",
    name: "Pejabat Pos Timur",
    type: "pickup",
    position: { x: 80, z: 40 },
    areaCode: "bandar",
    description: "Balik pos kedua untuk penghantaran baru",
    interactable: true,
  },
];

// ── Pure State Functions (boleh diuji) ────────────────────────────

/** Cipta session baharu dari keadaan kosong. */
export function createSession(): DeliverySession {
  return {
    state: "idle",
    packet: null,
    manifest: null,
    targetZone: null,
    reward: 0,
    xpReward: 0,
    nearbyZone: null,
    cooldownUntil: 0,
    deliveredAt: null,
    completeMessage: null,
    completeMessageTime: null,
    interactionMessage: null,
    interactionMessageTime: null,
  };
}

/**
 * `tick` — panggil setiap frame. Uruskan auto-reset, cooldown,
 * dan pembersihan mesej selesai selepas 4000ms.
 * Mengembalikan session baharu (stateless, pure).
 */
export function tickSession(
  session: DeliverySession,
  now: number,
  autoResetMs = 5000,
  messageClearMs = 4000,
): DeliverySession {
  const next = { ...session };

  // Auto-reset: complete → idle selepas autoResetMs
  if (next.state === "complete" && next.deliveredAt != null && now - next.deliveredAt >= autoResetMs) {
    next.state = "idle";
    next.packet = null;
    next.manifest = null;
    next.targetZone = null;
    next.reward = 0;
    next.xpReward = 0;
    next.deliveredAt = null;
    next.cooldownUntil = 0;
  }

  // Padam completeMessage selepas 4000ms
  if (
    next.completeMessage != null &&
    next.completeMessageTime != null &&
    now - next.completeMessageTime >= messageClearMs
  ) {
    next.completeMessage = null;
    next.completeMessageTime = null;
  }

  // Padam interactionMessage selepas 3000ms
  if (
    next.interactionMessage != null &&
    next.interactionMessageTime != null &&
    now - next.interactionMessageTime >= 3000
  ) {
    next.interactionMessage = null;
    next.interactionMessageTime = null;
  }

  return next;
}

/**
 * `interact` — panggil apabila pengguna menekan E.
 * Mengembalikan { result, session } atau `null` jika disekat.
 * Tiada side-effect: RNG, ID, tracking-number diterima sebagai argumen.
 *
 * "blocked" = cooldown aktif → E tidak boleh buat apa-apa
 * "nothing"  = zon ada tapi tiada aksi yang sah
 */
export function interact(
  session: DeliverySession,
  nearbyZone: DeliveryZone | null,
  now: number,
  createId: () => string,
  createTrackingNumber: (prefix: string) => string,
  rng: () => number,
): { result: DeliveryResult; session: DeliverySession } {
  // Sektakan jika masih dalam cooldown → "blocked"
  if (now < session.cooldownUntil) {
    return {
      result: { action: "blocked", message: "Tunggu sebentar..." },
      session,
    };
  }

  if (!nearbyZone) {
    return {
      result: { action: "nothing", message: "Tiada zon berdekatan" },
      session,
    };
  }

  const zone = nearbyZone;

  // Ambil paket di zon pickup
  if (zone.type === "pickup" && session.state === "idle") {
    const deliveryZones = DELIVERY_ZONES.filter((z) => z.type === "delivery");
    const targetZone = deliveryZones[Math.floor(rng() * deliveryZones.length)];
    const xpReward = 25 + Math.floor(rng() * 25);
    const trackingNumber = createTrackingNumber("MSK");
    const packetId = createId();
    const message = `Pilih paket dari ${zone.name}`;

    // Cipta Packet baharu
    const packet: Packet = {
      id: packetId,
      trackingNumber,
      senderName: "Penghantar",
      receiverName: "", // diisi semasa pickup
      senderAddress: zone.name,
      receiverAddress: targetZone.name,
      areaCode: targetZone.areaCode,
      weight: 0.5 + rng() * 2, // 0.5–2.5 kg
      dimensions: { length: 20, width: 15, height: 10 },
      volume: 3,
      paymentMethod: "prepaid",
      codAmount: 0,
      priority: "normal",
      specialInstructions: "",
      status: "incoming",
      history: [],
      createdAt: now,
      updatedAt: now,
    };

    const sessionWithPacket: DeliverySession = {
      ...session,
      state: "carrying",
      packet,
      manifest: {
        id: createId(),
        date: new Date().toISOString().split("T")[0],
        packets: [packetId],
        totalPackets: 1,
        totalWeight: packet.weight,
        totalVolume: packet.volume,
        codTotal: 0,
        status: "open",
        createdAt: now,
        closedAt: null,
      },
      targetZone,
      reward: 0,
      xpReward,
      cooldownUntil: now + 500,
      interactionMessage: message,
      interactionMessageTime: now,
    };

    return {
      result: { action: "pickup", message },
      session: sessionWithPacket,
    };
  }

  // Hantar paket di zon delivery
  if (zone.type === "delivery" && session.state === "carrying" && zone.id === session.targetZone?.id) {
    const reward = rollDeliveryReward(() => rng());
    const xpReward = session.xpReward;
    const message = `Penghantaran selesai! ${formatRinggit(reward)} | +${xpReward} XP`;

    // Update status paket → delivered
    const deliveredPacket = {
      ...session.packet!,
      status: "delivered" as PacketStatus,
      updatedAt: now,
      history: [
        ...session.packet!.history,
        { status: "delivered" as PacketStatus, timestamp: now, reason: "Paket diserahkan kepada penerima" },
      ],
    };

    const closedManifest: Manifest = {
      ...session.manifest!,
      status: "closed" as Manifest["status"],
      closedAt: now,
    };

    const sessionComplete: DeliverySession = {
      ...session,
      state: "complete",
      packet: deliveredPacket,
      manifest: closedManifest,
      reward,
      deliveredAt: now,
      cooldownUntil: now + 1000,
      completeMessage: message,
      completeMessageTime: now,
      interactionMessage: null,
      interactionMessageTime: null,
    };

    return {
      result: { action: "deliver", message, reward, xpReward },
      session: sessionComplete,
    };
  }

  // Zon pickup tetapi sudah membawa paket
  if (zone.type === "pickup" && session.state === "carrying") {
    return {
      result: { action: "nothing", message: "Anda sudah ada paket. Hantar dulu yang sedia ada." },
      session,
    };
  }

  return {
    result: { action: "nothing", message: "Tiada aktiviti di sini" },
    session,
  };
}

/**
 * `interactBlocksMotorSwap` — tulen: action → true jika motor swap disekat.
 * "pickup" / "deliver" / "blocked" → true  (swing disekat).
 * "nothing" / null    → false (biarkan motor swap).
 */
export function interactBlocksMotorSwap(action: string | null): boolean {
  if (action === null) return false;
  if (action === "nothing") return false;
  return true;
}

// Semua komponen sudah guna useDeliveryStore.
// Shim ini sudah boleh dibuang (2025-11-24).
