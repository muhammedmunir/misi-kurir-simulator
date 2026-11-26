import { DELIVERY_ZONES } from "@/lib/delivery-system";
import { describe, expect, it } from "vitest";
import { buildingLayout } from "./city-layout";
import { commercialBuildingModel, destinationHouses, emptyLotTrees } from "./kenney-building-model";
import { ROAD_LINES } from "./road-tiles";

describe("model bangunan Kenney", () => {
  it("memilih bangunan biasa pada 15 m dan pencakar langit apabila lebih tinggi", () => {
    expect(commercialBuildingModel(15, 13)).toBe("building-n");
    expect(commercialBuildingModel(15, 14)).toBe("building-a");
    expect(commercialBuildingModel(15.01, 4)).toBe("building-skyscraper-e");
    expect(commercialBuildingModel(15.01, 5)).toBe("building-skyscraper-a");
  });

  it("mengira model mengikut turutan alamat dan mengecualikan gudang", () => {
    const houses = destinationHouses();
    expect(houses.map(({ model }) => model)).toEqual([..."abcdefghi"].map((letter) => `building-type-${letter}`));
    expect(houses[0]).toMatchObject({ x: 60, z: 24, w: 8, h: 6.4, d: 6 });
  });
});

describe("pokok lot kosong", () => {
  it("meletakkan 3–5 pokok dalam setiap lot kosong secara deterministik", () => {
    const trees = emptyLotTrees();
    expect(trees).toEqual(emptyLotTrees());
    expect(new Set(trees.map(({ model }) => model))).toEqual(new Set(["tree-large", "tree-small"]));

    const occupied = [...buildingLayout(), ...DELIVERY_ZONES.flatMap(({ lot }) => (lot ? [lot] : []))];
    for (const minX of ROAD_LINES) {
      for (const minZ of ROAD_LINES) {
        const inLot = ({ x, z }: { x: number; z: number }) => x > minX && x < minX + 40 && z > minZ && z < minZ + 40;
        const lotTrees = trees.filter(inLot);
        if (occupied.some(inLot)) {
          expect(lotTrees).toHaveLength(0);
        } else {
          expect(lotTrees.length).toBeGreaterThanOrEqual(3);
          expect(lotTrees.length).toBeLessThanOrEqual(5);
        }
      }
    }
  });

  it("memastikan seluruh kanopi tidak bertindih dengan jalan atau bangunan", () => {
    const buildings = buildingLayout();
    const houses = destinationHouses();
    for (const tree of emptyLotTrees()) {
      for (const line of ROAD_LINES) {
        expect(Math.abs(tree.x - line) - tree.w / 2).toBeGreaterThan(6);
        expect(Math.abs(tree.z - line) - tree.d / 2).toBeGreaterThan(6);
      }
      for (const { x, z, w, d } of [...buildings.map((b) => ({ ...b, w: b.width, d: b.depth })), ...houses]) {
        expect(Math.abs(tree.x - x) > (tree.w + w) / 2 || Math.abs(tree.z - z) > (tree.d + d) / 2).toBe(true);
      }
    }
  });
});
