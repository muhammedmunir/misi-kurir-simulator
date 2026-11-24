import type { DeliveryZone } from "@/types/delivery";

const INTERACT_RADIUS = 4;

export function findNearbyInteractable(
  playerPos: { x: number; z: number },
  zones: DeliveryZone[],
): DeliveryZone | null {
  let closest: DeliveryZone | null = null;
  let closestDist = INTERACT_RADIUS;

  for (const zone of zones) {
    if (!zone.interactable) continue;
    const dx = playerPos.x - zone.position.x;
    const dz = playerPos.z - zone.position.z;
    const dist = Math.sqrt(dx * dx + dz * dz);

    if (dist < closestDist) {
      closestDist = dist;
      closest = zone;
    }
  }

  return closest;
}

export function getInteractionMessage(zone: DeliveryZone, hasPacket: boolean, deliveryTargetId: string | null): string {
  if (zone.type === "pickup" && !hasPacket) {
    return `Pilih paket dari ${zone.name}`;
  }
  if (zone.type === "delivery" && hasPacket && zone.id === deliveryTargetId) {
    return `Serahkan paket ke ${zone.name}`;
  }
  if (zone.type === "pickup" && hasPacket) {
    return "Anda sudah ada paket. Hantar dulu yang sedia ada.";
  }
  return "Tiada aktiviti di sini";
}
