import { rollDeliveryReward } from "@/data/economy";
import { closeManifest, isCarrying } from "@/delivery/manifest";
import { transition } from "@/delivery/packet";
import { DELIVERY_ZONES } from "@/lib/delivery-system";
import { formatRinggit } from "@/lib/utils";
import type { DeliveryAction, DeliveryResult, DeliverySession } from "@/types/delivery";
import type { Packet } from "@/types/game";
import type { Deps } from "@/warehouse/warehouse-logic";

// ── Helpers (pure) ────────────────────────────────────────────────

function deliverPacket(
  session: DeliverySession,
  packet: Packet,
  now: number,
  deps: Deps,
): { session: DeliverySession; result: DeliveryResult } {
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
    } else {
      // Manifest can't close yet (e.g. failed packets) — fall through to returning.
      next = settlePhase(next, now);
    }
  } else {
    message += ` — ${left} lagi`;
  }

  next = { ...next, completeMessage: message, completeMessageTime: now };
  return {
    session: next,
    result: { action: "deliver", message, reward, xpReward },
  };
}

function settlePhase(session: DeliverySession, now: number): DeliverySession {
  const next = { ...session };

  const hasOut = next.cargo.some((p) => p.status === "out_for_delivery");
  if (hasOut) return next;

  const hasFailed = next.cargo.some((p) => p.status === "failed");
  if (hasFailed) {
    return { ...next, phase: "returning" };
  }

  if (next.manifest) {
    const closed = closeManifest(next.manifest, next.cargo, now);
    if (closed.ok) {
      return { ...next, manifest: closed.manifest, phase: "complete", completedAt: now };
    }
  }
  return { ...next, phase: "complete", completedAt: now };
}

function lookupZone(id: string) {
  return DELIVERY_ZONES.find((z) => z.id === id);
}

// ── Public pure functions ─────────────────────────────────────────

/** Mark proof as taken. */
export function takeProof(session: DeliverySession, now?: number): DeliverySession {
  if (!session.handover) return session;
  const h = session.handover;
  return {
    ...session,
    handover: { ...h, proofTaken: true },
    interactionMessage: "Bukti: foto diambil",
    interactionMessageTime: now ?? Date.now(),
  };
}

/**
 * Complete (or attempt) handover.
 * Returns { result, session }.
 */
export function completeHandover(
  session: DeliverySession,
  now: number,
  deps: Deps,
): { result: DeliveryResult; session: DeliverySession } {
  if (!session.handover) {
    return { result: { action: "nothing", message: "Tiada serah terima aktif" }, session };
  }

  const h = session.handover;
  const zone = lookupZone(h.zoneId);

  if (zone?.receiverHome === false) {
    return { result: { action: "nothing", message: "Tiada orang di rumah" }, session };
  }

  if (!h.proofTaken) {
    return { result: { action: "nothing", message: "Ambil bukti penghantaran dahulu" }, session };
  }

  const packet = session.cargo.find((p) => p.id === h.packetId);
  if (!packet) {
    return { result: { action: "nothing", message: "Paket tidak ditemui" }, session };
  }

  const { session: delivered, result } = deliverPacket(session, packet, now, deps);
  return {
    result: { ...result, action: "deliver" as DeliveryAction },
    session: { ...delivered, handover: null },
  };
}

/**
 * Mark the handover packet as failed (receiver absent).
 */
export function failHandover(session: DeliverySession, now: number): DeliverySession {
  if (!session.handover) return session;

  const h = session.handover;
  const packet = session.cargo.find((p) => p.id === h.packetId);
  if (!packet) {
    return { ...session, handover: null };
  }

  const failed = transition(packet, "failed", "Penerima tiada di rumah", now, {
    inOpenManifest: isCarrying(session.manifest, packet.id),
    hasHandover: true,
  });
  const cargo = session.cargo.map((p) => (p.id === packet.id ? failed : p));
  const next: DeliverySession = {
    ...session,
    cargo,
    handover: null,
    interactionMessage: "Penerima tiada di rumah",
    interactionMessageTime: now,
  };

  return settlePhase(next, now);
}

/**
 * Return all failed packets to the warehouse.
 */
export function returnFailedPackets(session: DeliverySession, now: number): DeliverySession {
  const cargo = session.cargo.map((p) => {
    if (p.status !== "failed") return p;
    return transition(p, "returned", "Dipulangkan ke gudang", now, {
      inOpenManifest: isCarrying(session.manifest, p.id),
      hasHandover: true,
    });
  });

  let next: DeliverySession = { ...session, cargo };

  const hasOut = next.cargo.some((p) => p.status === "out_for_delivery");
  if (hasOut) {
    return next;
  }

  if (next.manifest) {
    const closed = closeManifest(next.manifest, next.cargo, now);
    if (closed.ok) {
      next = { ...next, manifest: closed.manifest, phase: "complete", completedAt: now };
    }
  } else {
    next = { ...next, phase: "complete", completedAt: now };
  }

  return next;
}
