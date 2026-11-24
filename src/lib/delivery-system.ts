import { rollDeliveryReward } from "@/data/economy";
import { type CargoLimits, closeManifest, isCarrying } from "@/delivery/manifest";
import { transition } from "@/delivery/packet";
import { formatRinggit } from "@/lib/utils";
import type { DeliveryAction, DeliveryResult, DeliverySession, DeliveryZone } from "@/types/delivery";
import type { Packet } from "@/types/game";
import { type Deps, WAREHOUSE, generateInbound } from "@/warehouse/warehouse-logic";

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
  destination("zone-delivery-3", "Pusat Industri Timur", "industri", 100, -60, "Penghantaran kargo industri"),
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

/** Call every frame: auto-reset after completion and expire messages. */
export function tickSession(
  session: DeliverySession,
  now: number,
  autoResetMs = 5000,
  messageClearMs = 4000,
): DeliverySession {
  const next = { ...session };

  if (next.phase === "complete" && next.completedAt != null && now - next.completedAt >= autoResetMs) {
    next.phase = "idle";
    next.manifest = null;
    next.cargo = [];
    next.completedAt = null;
    next.cooldownUntil = 0;
    // Targets of packets still waiting at the warehouse are kept.
    next.targets = Object.fromEntries(next.inbound.map((p) => [p.id, session.targets[p.id]]));
  }

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
 *  - warehouse desk: open the panel (restocking inbound if empty)
 *  - delivery zone: hand over the cargo packet addressed here
 */
export function interact(
  session: DeliverySession,
  zone: DeliveryZone | null,
  now: number,
  deps: Deps,
): { result: DeliveryResult; session: DeliverySession } {
  if (zone && now < session.cooldownUntil) {
    return { result: { action: "blocked", message: "Tunggu sebentar..." }, session };
  }
  if (!zone) return { result: { action: "nothing", message: "Tiada zon berdekatan" }, session };

  if (zone.type === "pickup") {
    if (session.phase === "delivering") return say(session, "nothing", "Hantar paket dalam motor dahulu", now);
    if (session.phase === "complete") return say(session, "nothing", "Manifest selesai. Tunggu sebentar.", now);

    let next: DeliverySession = { ...session, panelOpen: true, cooldownUntil: now + 300 };
    if (next.inbound.length === 0 && next.cargo.length === 0) {
      const batch = generateInbound(INBOUND_BATCH, DESTINATIONS, zone.name, deps, now);
      next = { ...next, inbound: batch.packets, targets: { ...next.targets, ...batch.targets } };
    }
    return { result: { action: "open_warehouse", message: "Gudang dibuka" }, session: next };
  }

  const packet = deliverableAt(session, zone);
  if (!packet) {
    const msg =
      session.phase === "delivering" ? "Tiada paket untuk alamat ini" : "Tiada paket. Muat paket di gudang dahulu.";
    return say(session, "nothing", msg, now);
  }

  // Handover = this interaction until receiver NPCs exist (Langkah 5).
  const delivered = transition(packet, "delivered", "Paket diserahkan kepada penerima", now, {
    inOpenManifest: isCarrying(session.manifest, packet.id),
    hasHandover: true,
  });
  const cargo = session.cargo.map((p) => (p.id === packet.id ? delivered : p));
  const reward = rollDeliveryReward(deps.rng);
  const xpReward = 25 + Math.floor(deps.rng() * 25);
  const left = cargo.filter((p) => p.status === "out_for_delivery").length;

  let next: DeliverySession = {
    ...session,
    cargo,
    cooldownUntil: now + 1000,
    interactionMessage: null,
    interactionMessageTime: null,
  };
  let message = `Diserahkan kepada ${packet.receiverName}! ${formatRinggit(reward)} | +${xpReward} XP`;

  if (left === 0 && session.manifest) {
    const closed = closeManifest(session.manifest, cargo, now);
    if (closed.ok) {
      next = { ...next, manifest: closed.manifest, phase: "complete", completedAt: now };
      message += " — semua paket selesai";
    }
  } else {
    message += ` — ${left} lagi`;
  }

  next = { ...next, completeMessage: message, completeMessageTime: now };
  return { result: { action: "deliver", message, reward, xpReward }, session: next };
}

/** Whether this interaction result consumes the press (so no motor mount/dismount). */
export function interactBlocksMotorSwap(action: DeliveryAction | null): boolean {
  return action !== null && action !== "nothing";
}
