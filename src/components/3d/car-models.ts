export const CAR_MODELS = [
  "/models/car-kit/sedan.glb",
  "/models/car-kit/taxi.glb",
  "/models/car-kit/van.glb",
  "/models/car-kit/suv.glb",
  "/models/car-kit/hatchback-sports.glb",
  "/models/car-kit/delivery.glb",
] as const;

const CAR_SIZES: Readonly<Record<string, Readonly<{ w: number; h: number; d: number }>>> = {
  "car-kit/sedan": { w: 1.8, h: 1.45, d: 4.5 },
  "car-kit/taxi": { w: 1.8, h: 1.45, d: 4.5 },
  "car-kit/van": { w: 1.9, h: 1.95, d: 4.8 },
  "car-kit/suv": { w: 1.9, h: 1.75, d: 4.6 },
  "car-kit/hatchback-sports": { w: 1.75, h: 1.45, d: 4 },
  "car-kit/delivery": { w: 1.9, h: 1.95, d: 4.8 },
};

export function trafficCarSize(model: string) {
  const size = CAR_SIZES[model];
  if (!size) throw new Error(`Saiz model kereta tidak tersedia: ${model}`);
  return size;
}

export function carModelPath(url: (typeof CAR_MODELS)[number]): string {
  return url.slice("/models/".length, -".glb".length);
}

export function carModelFor(npcIndex: number): number {
  return npcIndex % CAR_MODELS.length;
}
