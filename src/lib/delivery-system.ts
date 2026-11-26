import { returnFailedPackets } from "@/delivery/handover";
import type { CargoLimits } from "@/delivery/manifest";
import type { DeliveryAction, DeliveryHandover, DeliveryResult, DeliverySession, DeliveryZone } from "@/types/delivery";
import type { Packet } from "@/types/game";
import type { Deps } from "@/warehouse/warehouse-logic";
import { WAREHOUSE, generateInbound } from "@/warehouse/warehouse-logic";

/** Destination house placeholder, relative to its lot centre. */
export const HOUSE = { width: 8, height: 5, depth: 6, zOffset: 4, doorOffset: 9 } as const;

/** Starter motor (Motor Matic) cargo, matching DEFAULT_VEHICLES specs. */
export const STARTER_CARGO: CargoLimits = { maxVolume: 20, maxWeight: 15 };

/** How many new packets arrive when the warehouse runs empty. */
export const INBOUND_BATCH = 5;

/**
 * An address on the block centred at (lotX, lotZ): the house faces +z towards
 * the road 20 units away; the door (zone) is just outside the house, the
 * parking box sits on the road shoulder in front.
 */
function destination(
  id: string,
  name: string,
  areaCode: string,
  lotX: number,
  lotZ: number,
  description: string,
  receiverHome = true,
): DeliveryZone {
  return {
    id,
    name,
    type: "delivery",
    position: { x: lotX, z: lotZ + HOUSE.doorOffset },
    areaCode,
    description,
    interactable: true,
    lot: { x: lotX, z: lotZ },
    parking: { x: lotX, z: lotZ + 17, halfX: 2.5, halfZ: 1.5 },
    receiverHome,
  };
}

// ── Zone Data ─────────────────────────────────────────────────────

export const DELIVERY_ZONES: DeliveryZone[] = [
  {
    id: "zone-pickup-1",
    name: "Gudang Pejabat Pos Pusat",
    type: "pickup",
    // Sorting desk, inside the warehouse building
    position: { x: WAREHOUSE.center.x, z: WAREHOUSE.center.z + 1 },
    areaCode: "bandar",
    description: "Meja sortir gudang",
    interactable: true,
    lot: WAREHOUSE.center,
  },
  destination("zone-delivery-1", "Kedai Runcit Mak Minah", "perumahan", 60, 20, "Penghantaran ke kedai runcit"),
  destination("zone-delivery-2", "Kafe Kampung Digital", "pasar", -20, -20, "Penghantaran ke kafe tempatan"),
  destination("zone-delivery-3", "Pusat Industri Timur", "industri", 100, -60, "Penghantaran kargo industri", false),
  // Pelan 010: alamat tambahan, semuanya di lot yang sedia kosong supaya susun atur bangunan tidak berubah.
  destination("zone-delivery-4", "Rumah Pak Abu", "perumahan", -60, 20, "Penghantaran ke rumah teres"),
  destination("zone-delivery-5", "Klinik Desa Sejahtera", "bandar", -20, 60, "Penghantaran bekalan klinik"),
  destination("zone-delivery-6", "Kedai Kopi Ah Seng", "pasar", 20, 60, "Penghantaran ke kedai kopi"),
  destination("zone-delivery-7", "Bengkel Motor Raju", "industri", 60, -20, "Penghantaran alat ganti"),
  destination("zone-delivery-8", "Pasar Mini Pak Din", "pasar", -60, -20, "Penghantaran ke pasar mini"),
  destination("zone-delivery-9", "Flat Sri Mawar", "perumahan", 60, 60, "Penghantaran ke flat"),
];

const DESTINATIONS = DELIVERY_ZONES.filter((z) => z.type === "delivery");

/** Parking boxes of every destination, for checkParking(). */
export const PARKING_BOXES = DESTINATIONS.flatMap((z) => (z.parking ? [{ zoneId: z.id, box: z.parking }] : []));

// ── Session ───────────────────────────────────────────────────────

export function createSession(): DeliverySession {
  return {
    phase: "idle",
    inbound: [],
    manifest: null,
    cargo: [],
    targets: {},
    panelOpen: false,
    nearbyZone: null,
    cooldownUntil: 0,
    lastParking: null,
    completedAt: null,
    completeMessage: null,
    completeMessageTime: null,
    interactionMessage: null,
    interactionMessageTime: null,
    handover: null,
    tally: { earned: 0, xp: 0 },
    summary: null,
  };
}

/** Cargo packets still to be handed over. */
export function pendingCargo(s: DeliverySession): Packet[] {
  return s.cargo.filter((p) => p.status === "out_for_delivery");
}

/** The cargo packet deliverable at `zone`, if any. */
export function deliverableAt(s: DeliverySession, zone: DeliveryZone): Packet | null {
  if (s.phase !== "delivering") return null;
  return pendingCargo(s).find((p) => s.targets[p.id] === zone.id) ?? null;
}

/** Zone of the next pending packet (for HUD / zone highlight). */
export function nextTargetZone(s: DeliverySession): DeliveryZone | null {
  const next = pendingCargo(s)[0];
  if (!next) return null;
  return DELIVERY_ZONES.find((z) => z.id === s.targets[next.id]) ?? null;
}

/** Call every frame: expire messages. No longer auto-resets complete→idle. */
export function tickSession(session: DeliverySession, now: number, messageClearMs = 4000): DeliverySession {
  const next = { ...session };

  if (next.completeMessageTime != null && now - next.completeMessageTime >= messageClearMs) {
    next.completeMessage = null;
    next.completeMessageTime = null;
  }

  if (next.interactionMessageTime != null && now - next.interactionMessageTime >= 3000) {
    next.interactionMessage = null;
    next.interactionMessageTime = null;
  }

  return next;
}

function say(session: DeliverySession, action: DeliveryAction, message: string, now: number) {
  return {
    result: { action, message },
    session: { ...session, interactionMessage: message, interactionMessageTime: now },
  };
}

/**
 * One interaction (E key / action button). Pure: ids, tracking numbers and
 * randomness are injected.
 *  - warehouse desk: open the panel (restocking inbound if empty),
 *    or return failed packets when phase is "returning"
 *  - delivery zone: open handover workflow when onFoot
 */
export function interact(
  session: DeliverySession,
  zone: DeliveryZone | null,
  now: number,
  deps: Deps,
  ctx?: { onFoot: boolean },
): { result: DeliveryResult; session: DeliverySession } {
  // Default: no context = onFoot is false (not inferred from zone type).
  const flag = ctx?.onFoot ?? false;

  if (zone && now < session.cooldownUntil) {
    return { result: { action: "blocked", message: "Tunggu sebentar..." }, session };
  }
  if (!zone) return { result: { action: "nothing", message: "Tiada zon berdekatan" }, session };

  // ── Warehouse desk ────────────────────────────────────────────
  if (zone.type === "pickup") {
    if (session.phase === "returning") {
      // Delegate to returnFailedPackets which returns DeliverySession directly.
      // Derive action from whether failed packets were present.
      const hasFailed = session.cargo.some((p) => p.status === "failed");
      const returned = returnFailedPackets(session, now);
      const action: DeliveryAction = hasFailed ? "return_packets" : "close_manifest";

      return {
        result: { action, message: hasFailed ? "Paket dipulangkan" : "Manifest ditutup" },
        session: {
          ...returned,
          handover: null,
          cooldownUntil: now + 300,
          interactionMessage: hasFailed ? "Paket dipulangkan ke gudang" : "Manifest ditutup",
          interactionMessageTime: now,
        },
      };
    }

    if (session.phase === "delivering") return say(session, "nothing", "Hantar paket dalam motor dahulu", now);
    if (session.phase === "complete") return say(session, "nothing", "Manifest selesai. Tunggu sebentar.", now);

    let next: DeliverySession = { ...session, panelOpen: true, cooldownUntil: now + 300 };
    if (next.inbound.length === 0 && next.cargo.length === 0) {
      const batch = generateInbound(INBOUND_BATCH, DESTINATIONS, zone.name, deps, now);
      next = { ...next, inbound: batch.packets, targets: { ...next.targets, ...batch.targets } };
    }
    return { result: { action: "open_warehouse", message: "Gudang dibuka" }, session: next };
  }

  // ── Delivery zone ─────────────────────────────────────────────
  if (!flag) {
    // Still on motor — do nothing so the press dismounts first
    return say(session, "nothing", "Turun dari motor dahulu", now);
  }

  const packet = deliverableAt(session, zone);
  if (!packet) {
    const msg =
      session.phase === "delivering" ? "Tiada paket untuk alamat ini" : "Tiada paket. Muat paket di gudang dahulu.";
    return say(session, "nothing", msg, now);
  }

  // Paket mesti di tangan: ambil dari motor dahulu.
  if (!(session.carry ?? []).includes(packet.id)) {
    return say(session, "nothing", "Ambil paket dari motor dahulu", now);
  }

  // Open handover workflow
  const handover: DeliveryHandover = { packetId: packet.id, zoneId: zone.id, proofTaken: false };
  return {
    result: { action: "open_handover", message: "Serah terima dibuka" },
    session: {
      ...session,
      handover,
      cooldownUntil: now + 300,
      interactionMessage: "Serah terima dibuka",
      interactionMessageTime: now,
    },
  };
}

/** Whether this interaction result consumes the press (so no motor mount/dismount). */
export function interactBlocksMotorSwap(action: DeliveryAction | null): boolean {
  return action !== null && action !== "nothing";
}

/**
 * Acknowledge the manifest summary and return to idle.
 * Clears manifest, cargo, summary, tally, completedAt, cooldown, targets
 * (keeps targets for inbound packets).
 */
export function acknowledgeSummary(session: DeliverySession): DeliverySession {
  if (session.phase !== "complete") return session;

  // Keep targets only for packets still in inbound
  const targets = Object.fromEntries(session.inbound.map((p) => [p.id, session.targets[p.id]]));

  return {
    ...session,
    phase: "idle",
    manifest: null,
    cargo: [],
    completedAt: null,
    cooldownUntil: 0,
    summary: null,
    tally: { earned: 0, xp: 0 },
    targets,
  };
}
