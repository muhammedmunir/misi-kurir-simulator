import type { DeliveryZone } from "@/types/delivery";

export type CustomerMood = "home" | "absent" | "refuse" | "neighbour";

export function canCollectCustomerCod(mood: CustomerMood | undefined): boolean {
  return mood === undefined || mood === "home" || mood === "neighbour";
}

export function rollCustomer(rng: () => number, zone: DeliveryZone): CustomerMood {
  if (zone.receiverHome === false) return "absent";
  const draw = rng();
  if (draw < 0.75) return "home";
  if (draw < 0.85) return "absent";
  if (draw < 0.93) return "neighbour";
  return "refuse";
}
