import type { DeliverySession } from "@/types/delivery";

export interface ButtonInfo {
  label: string;
  enabled: boolean;
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
    return session.hasPacket ? { label: "Hantar dulu", enabled: false } : { label: "AMBIL PAKET", enabled: true };
  }

  if (!session.hasPacket) return { label: "Tiada paket", enabled: false };
  if (zone.id !== session.targetZone?.id) return { label: "Bukan sini", enabled: false };
  return { label: "HANTAR PAKET", enabled: true };
}

export interface MotorContext {
  onFoot: boolean;
  nearMotor: boolean;
}

/**
 * Full action button = what one tap (or the E key) will do.
 * Same priority as PlayerController.performInteract(): a delivery action wins,
 * a cooldown blocks everything, otherwise fall back to mounting/dismounting.
 */
export function getActionButton(delivery: ButtonInfo, motor: MotorContext): ButtonInfo {
  if (delivery.enabled) return delivery;
  if (delivery.label === "Tunggu...") return delivery;
  if (!motor.onFoot) return { label: "TURUN MOTOR", enabled: true };
  if (motor.nearMotor) return { label: "NAIK MOTOR", enabled: true };
  return delivery;
}
