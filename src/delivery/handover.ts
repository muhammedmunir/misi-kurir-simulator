import { rollDeliveryReward } from "@/data/economy";
import { codCollectedTotal } from "@/delivery/cod";
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
  const tally = {
    earned: session.tally.earned + reward,
    xp: session.tally.xp + xpReward,
  };
  const left = cargo.filter((p) => p.status === "out_for_delivery").length;

  let next: DeliverySession = {
    ...session,
    cargo,
    tally,
    cooldownUntil: now + 1000,
    interactionMessage: null,
    interactionMessageTime: null,
  };
  let message = `Diserahkan kepada ${packet.receiverName}! ${formatRinggit(reward)} | +${xpReward} XP`;

  if (left === 0) {
    next.phase = "returning";
    next.completedAt = now;
    next.completeMessage = "Semua paket dihantar — kembali ke gudang";
    next.completeMessageTime = now;
  }

  message += left === 0 ? " — kembali ke gudang" : ` — ${left} lagi`;
  next = { ...next, completeMessage: message, completeMessageTime: now };
  return {
    session: next,
    result: { action: "deliver", message, reward, xpReward },
  };
}

function settlePhase(session: DeliverySession): DeliverySession {
  const next = { ...session };

  const hasOut = next.cargo.some((p) => p.status === "out_for_delivery");
  if (hasOut) return next;

  return { ...next, phase: "returning" };
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

  if (packet.paymentMethod === "cod" && !h.codCollected) {
    return { result: { action: "nothing", message: "Kutip bayaran COD dahulu" }, session };
  }

  const { session: delivered, result } = deliverPacket(session, packet, now, deps);
  // Paket berpindah dari tangan kurier kepada penerima.
  const carry = (delivered.carry ?? []).filter((id) => id !== packet.id);
  return {
    result: { ...result, action: "deliver" as DeliveryAction },
    session: { ...delivered, handover: null, carry },
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

  return settlePhase(next);
}

/**
 * Return all failed packets, close manifest, create summary, set phase to "complete".
 * Returns the updated `DeliverySession` directly.
 */
export function returnFailedPackets(session: DeliverySession, now: number): DeliverySession {
  let cargo = session.cargo;
  let manifest = session.manifest;

  const hasFailed = session.cargo.some((p) => p.status === "failed");

  if (hasFailed) {
    cargo = session.cargo.map((p) => {
      if (p.status !== "failed") return p;
      return transition(p, "returned", "Dipulangkan ke gudang", now, {
        inOpenManifest: isCarrying(manifest, p.id),
        hasHandover: true,
      });
    });
  }

  // Close manifest
  if (manifest) {
    const closed = closeManifest(manifest, cargo, now);
    if (closed.ok) {
      manifest = closed.manifest;
    }
  }

  // Create summary
  const summary = {
    manifestId: manifest?.id,
    delivered: cargo.filter((p) => p.status === "delivered").length,
    returned: cargo.filter((p) => p.status === "returned").length,
    earned: session.tally.earned,
    xp: session.tally.xp,
    codCollected: codCollectedTotal(cargo),
    durationMs: manifest ? now - manifest.createdAt : 0,
  };

  return {
    ...session,
    phase: "complete",
    manifest,
    cargo,
    summary,
    completedAt: now,
  };
}
