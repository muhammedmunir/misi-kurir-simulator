/** Susun atur bandar — data tulen, tiada React/three. Dipakai oleh `Buildings` dan `Roads`. */
import { DELIVERY_ZONES } from "@/lib/delivery-system";

export type BuildingLot = {
  x: number;
  y: number;
  z: number;
  width: number;
  height: number;
  depth: number;
  color: string;
  floors: number;
};

const RESERVED_LOTS = new Set(DELIVERY_ZONES.flatMap((z) => (z.lot ? [`${z.lot.x},${z.lot.z}`] : [])));

const BUILDING_COLORS = ["#4a5568", "#5a6578", "#6a7588", "#3d4f5f", "#7a8a9a", "#4b5c6d"];

export function buildingLayout(): BuildingLot[] {
  const result: BuildingLot[] = [];
  const seed = 42;
  let rng = seed;
  const pseudoRandom = () => {
    rng = (rng * 16807) % 2147483647;
    return (rng - 1) / 2147483646;
  };

  // Buildings along roads (grid pattern)
  for (let gx = -3; gx <= 3; gx++) {
    for (let gz = -3; gz <= 3; gz++) {
      const emptyLot = pseudoRandom() > 0.5;

      // Block centres (between roads), not road intersections: roads are 12 wide on
      // multiples of 40, so a block spans ±14 around its centre.
      const bx = gx * 40 + 20 + (pseudoRandom() - 0.5) * 4;
      const bz = gz * 40 + 20 + (pseudoRandom() - 0.5) * 4;
      const width = 6 + pseudoRandom() * 8;
      const depth = 6 + pseudoRandom() * 8;
      if (emptyLot) continue;
      // The warehouse and delivery addresses occupy their own blocks.
      if (RESERVED_LOTS.has(`${gx * 40 + 20},${gz * 40 + 20}`)) continue;
      const height = 5 + pseudoRandom() * 20;
      const floors = Math.floor(height / 3);

      result.push({
        x: bx,
        y: height / 2,
        z: bz,
        width,
        height,
        depth,
        color: BUILDING_COLORS[Math.floor(pseudoRandom() * BUILDING_COLORS.length)],
        floors,
      });
    }
  }
  return result;
}

export function windowPositions(b: BuildingLot): [number, number, number][] {
  const out: [number, number, number][] = [];
  const zFront = b.z + b.depth / 2 + 0.05;
  for (let floor = 0; floor < Math.min(b.floors, 5); floor++) {
    for (let wi = 0; wi < 3; wi++) {
      out.push([b.x - b.width / 3 + wi * (b.width / 4), b.y - b.height / 2 + 2 + floor * 3, zFront]);
    }
  }
  return out;
}

export function doorPosition(b: BuildingLot): [number, number, number] {
  return [b.x, b.y - b.height / 2 + 1.5, b.z + b.depth / 2 + 0.05];
}
