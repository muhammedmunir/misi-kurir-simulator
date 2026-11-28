import { DELIVERY_ZONES, HOUSE } from "@/lib/delivery-system";
import { buildingLayout } from "./city-layout";
import { suburbanBuildingSize } from "./kenney-building-size";
import { ROAD_LINES } from "./road-tiles";

export { commercialBuildingModel } from "./kenney-building-size";

const HOUSE_MODELS = "abcdefghi";

export function destinationHouses() {
  return DELIVERY_ZONES.flatMap((zone) => (zone.type === "delivery" && zone.lot ? [zone.lot] : [])).map((lot, i) => {
    const model = `building-type-${HOUSE_MODELS[i % HOUSE_MODELS.length]}`;
    const size = suburbanBuildingSize(model);
    // Kekalkan muka rumah 2 m di belakang zon interaksi; kedalaman bertambah ke belakang lot.
    return { model, x: lot.x, z: lot.z + HOUSE.doorOffset - 2 - size.d / 2, ...size };
  });
}

const TREE_MODELS = ["tree-large", "tree-small"] as const;
const TREE_OFFSETS = [
  [-8, -8],
  [8, -8],
  [8, 8],
  [-8, 8],
  [0, 0],
] as const;
const TREE_SIZES = { "tree-large": { w: 4.5, h: 6, d: 4.5 }, "tree-small": { w: 2.5, h: 3.5, d: 2.5 } };
const BLOCK_HALF = (ROAD_LINES[1] - ROAD_LINES[0]) / 2;

export function emptyLotTrees() {
  const occupied = [...buildingLayout(), ...DELIVERY_ZONES.flatMap(({ lot }) => (lot ? [lot] : []))];
  return ROAD_LINES.flatMap((minX, ix) =>
    ROAD_LINES.flatMap((minZ, iz) => {
      const x = minX + BLOCK_HALF;
      const z = minZ + BLOCK_HALF;
      if (occupied.some((lot) => Math.abs(lot.x - x) < BLOCK_HALF && Math.abs(lot.z - z) < BLOCK_HALF)) {
        return [];
      }

      const seed = ix * ROAD_LINES.length + iz;
      return Array.from({ length: 3 + (seed % 3) }, (_, i) => {
        const model = TREE_MODELS[(seed + i) % TREE_MODELS.length];
        const [dx, dz] = TREE_OFFSETS[(seed + i) % TREE_OFFSETS.length];
        return { model, x: x + dx, z: z + dz, ...TREE_SIZES[model] };
      });
    }),
  );
}
