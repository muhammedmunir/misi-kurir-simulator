import { deliverableAt } from "@/lib/delivery-system";
import type { DeliverySession } from "@/types/delivery";
import { canDismount } from "@/vehicles/motor-state";

export interface ButtonInfo {
  label: string;
  enabled: boolean;
  /** Rider must be on foot to use this button. */
  needsOnFoot?: boolean;
}

/**
 * Delivery part of the action button. Mirrors `interact()` in delivery-system:
 * no zone → nothing to do; cooldown only matters while standing in a zone.
 */
export function getInteractButtonInfo(session: DeliverySession, now: number): ButtonInfo {
  const zone = session.nearbyZone;
  if (!zone) return { label: "Tiada zon", enabled: false };

  if (now < session.cooldownUntil) return { label: "Tunggu...", enabled: false };

  if (zone.type === "pickup") {
    if (session.phase === "returning") {
      const hasFailed = session.cargo.some((p) => p.status === "failed");
      if (hasFailed) return { label: "PULANGKAN PAKET", enabled: true };
      return { label: "TUTUP MANIFEST", enabled: true };
    }
    if (session.phase === "delivering") return { label: "Hantar dulu", enabled: false };
    if (session.phase === "complete") return { label: "Tunggu...", enabled: false };
    return { label: "BUKA GUDANG", enabled: true };
  }

  if (deliverableAt(session, zone)) return { label: "SERAH PAKET", enabled: true, needsOnFoot: true };
  if (session.phase === "delivering") return { label: "Bukan sini", enabled: false };
  return { label: "Tiada paket", enabled: false };
}

export interface MotorContext {
  onFoot: boolean;
  nearMotor: boolean;
  /** Motor speed (units/s); dismounting needs canDismount(speed). */
  speed: number;
}

/**
 * Full action button = what one tap (or the E key) will do.
 * Same priority as PlayerController.performInteract(): a delivery action wins,
 * a cooldown blocks everything, otherwise fall back to mounting/dismounting.
 */
export function getActionButton(delivery: ButtonInfo, motor: MotorContext): ButtonInfo {
  // Needs on foot but rider is on motor → suggest dismount instead of delivery action
  if (delivery.needsOnFoot && !motor.onFoot) {
    return canDismount(motor.speed)
      ? { label: "TURUN MOTOR", enabled: true }
      : { label: "BERHENTI DULU", enabled: false };
  }
  if (delivery.enabled) return delivery;
  if (delivery.label === "Tunggu...") return delivery;
  if (!motor.onFoot) {
    return canDismount(motor.speed)
      ? { label: "TURUN MOTOR", enabled: true }
      : { label: "BERHENTI DULU", enabled: false };
  }
  if (motor.nearMotor) return { label: "NAIK MOTOR", enabled: true };
  return delivery;
}
