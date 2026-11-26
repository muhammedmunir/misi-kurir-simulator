export const CAR_MODELS = [
  "/models/car-kit/sedan.glb",
  "/models/car-kit/taxi.glb",
  "/models/car-kit/van.glb",
  "/models/car-kit/suv.glb",
  "/models/car-kit/hatchback-sports.glb",
  "/models/car-kit/delivery.glb",
] as const;

export function carModelFor(npcIndex: number): number {
  return npcIndex % CAR_MODELS.length;
}
