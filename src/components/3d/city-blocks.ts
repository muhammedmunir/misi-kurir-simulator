import { DELIVERY_ZONES } from "@/lib/delivery-system";
import { WAREHOUSE } from "@/warehouse/warehouse-logic";
import { trafficCarSize } from "./car-models";
import { buildingLayout } from "./city-layout";
import { destinationHouses, emptyLotTrees } from "./kenney-building-model";
import { commercialBuildingSize, suburbanBuildingSize } from "./kenney-building-size";
import { ROAD_LINES } from "./road-tiles";

export type Placement = {
  model: string;
  x: number;
  z: number;
  rotY: number;
  w: number;
  h: number;
  d: number;
  solid: boolean;
};

const SUB = "city-kit-suburban";
const COM = "city-kit-commercial";
const ROADS = "city-kit-roads";
const QUARTER = Math.PI / 2;
const HALF = 14;
const HOUSE_MODELS = ["building-type-m", "building-type-o", "building-type-r"];
const SHOP_MODELS = ["low-detail-building-c", "low-detail-building-j"];
const CAR_MODELS = ["car-kit/sedan", "car-kit/hatchback-sports", "car-kit/suv", "car-kit/van"];

function prop(
  model: string,
  x: number,
  z: number,
  w: number,
  h: number,
  d: number,
  solid = false,
  rotY = 0,
): Placement {
  return { model, x, z, rotY, w, h, d, solid };
}

export function placementFootprint({ x, z, w, d, rotY }: Placement) {
  const swap = Math.abs(Math.round(rotY / QUARTER)) % 2 === 1;
  const halfX = (swap ? d : w) / 2;
  const halfZ = (swap ? w : d) / 2;
  return { minX: x - halfX, maxX: x + halfX, minZ: z - halfZ, maxZ: z + halfZ };
}

type Footprint = ReturnType<typeof placementFootprint>;

function overlaps(a: Footprint, b: Footprint, gap = 0) {
  return a.minX < b.maxX + gap && b.minX < a.maxX + gap && a.minZ < b.maxZ + gap && b.minZ < a.maxZ + gap;
}

export function blockPlacements(): Placement[] {
  const placements: Placement[] = [];
  const towers = buildingLayout();
  const houses = destinationHouses();
  const legacyTrees = emptyLotTrees();
  let seed = 239;
  function pick<T>(items: readonly T[]): T {
    seed = (seed * 16807) % 2147483647;
    return items[seed % items.length];
  }

  for (const minX of ROAD_LINES) {
    for (const minZ of ROAD_LINES) {
      const x = minX + 20;
      const z = minZ + 20;
      if (x === WAREHOUSE.center.x && z === WAREHOUSE.center.z) continue;
      const address = DELIVERY_ZONES.find((zone) => zone.type === "delivery" && zone.lot?.x === x && zone.lot.z === z);
      const tower = towers.find((b) => Math.abs(b.x - x) < HALF && Math.abs(b.z - z) < HALF);
      const gardens: Footprint[] = [];
      const keepClear: { box: Footprint; gap: number }[] = [];
      const house = address && houses.find((h) => h.x === x && Math.abs(h.z - z) < HALF);
      if (address && house) {
        keepClear.push(
          { box: placementFootprint({ ...house, rotY: 0, solid: true }), gap: 2 },
          { box: { minX: x - 3, maxX: x + 3, minZ: address.position.z - 1, maxZ: z + HALF }, gap: 0 },
        );
      }
      if (tower) {
        keepClear.push({
          box: placementFootprint(prop("", tower.x, tower.z, tower.width, tower.height, tower.depth)),
          gap: 1,
        });
      }

      function add(p: Placement) {
        const b = placementFootprint(p);
        if (b.minX < x - HALF || b.maxX > x + HALF || b.minZ < z - HALF || b.maxZ > z + HALF) return false;
        if (
          keepClear.some(({ box, gap }) => overlaps(b, box, gap)) ||
          (p.solid && gardens.some((box) => overlaps(b, box)))
        )
          return false;
        placements.push(p);
        if (p.solid) gardens.push(b);
        return true;
      }

      if (address || (!tower && Math.abs(x) !== 20 && Math.abs(z) !== 20)) {
        const plots = address
          ? [
              [-9.9, -10],
              [9.9, -10],
            ]
          : [
              [-8, -8],
              [8, -8],
              [-8, 3.5],
              [8, 3.5],
            ];
        for (const [dx, dz] of plots) {
          const model = address ? "building-type-r" : pick(HOUSE_MODELS);
          const size = suburbanBuildingSize(model);
          add({ model: `${SUB}/${model}`, x: x + dx, z: z + dz, ...size, solid: true, rotY: dz < 0 ? Math.PI : 0 });
        }
        for (const dx of [-8.5, 8.5]) {
          add(prop(`${SUB}/driveway-short`, x + dx, z + 10.8, 3.6, 0.08, 5));
          const model = pick(CAR_MODELS);
          const { w, h, d } = trafficCarSize(model);
          add(prop(model, x + dx, z + 10.8, w, h, d, true));
          const fenceX = dx + (dx > 0 ? 3.25 : -3.25);
          add(prop(`${SUB}/fence-low`, x + fenceX, z + 10.8, 5.8, 0.95, 0.2, true, QUARTER));
        }
        for (const dx of [-9, 0, 9]) {
          const tree = legacyTrees.find((t) => Math.abs(t.x - x - dx) < 2 && Math.abs(t.z - z + 8) < 2);
          add(
            prop(`${SUB}/${tree?.model ?? "tree-small"}`, x + dx, z - 8, tree?.w ?? 2.8, tree?.h ?? 4, tree?.d ?? 2.8),
          );
        }
      } else if (tower) {
        const model = "building-type-r";
        const size = suburbanBuildingSize(model);
        for (const dx of [-9.9, 9.9]) {
          for (const dz of [-9.9, 9.9]) {
            const rotY = dz < 0 ? Math.PI : 0;
            if (add({ model: `${SUB}/${model}`, x: x + dx, z: z + dz, ...size, solid: true, rotY })) continue;
            const shop = pick(SHOP_MODELS);
            add({ model: `${COM}/${shop}`, x: x + dx, z: z + dz, ...commercialBuildingSize(shop), solid: true, rotY });
          }
        }
        for (const dz of [-11.8, 11.8]) add(prop(`${SUB}/tree-small`, x, z + dz, 2.5, 4.2, 2.5));
      } else {
        const rotY = Math.abs(z) === 20 ? (z > 0 ? Math.PI : 0) : x > 0 ? -QUARTER : QUARTER;
        const row = (u: number, v: number) => ({
          x: x + u * Math.cos(rotY) + v * Math.sin(rotY),
          z: z - u * Math.sin(rotY) + v * Math.cos(rotY),
        });
        for (const u of [-10.2, -3.4, 3.4, 10.2]) {
          const shop = row(u, 1);
          const canopy = row(u, 5.6);
          const model = pick(SHOP_MODELS);
          add({ model: `${COM}/${model}`, ...shop, ...commercialBuildingSize(model), solid: true, rotY });
          add(prop(`${COM}/detail-awning-wide`, canopy.x, canopy.z, 5.8, 0.85, 2.2, false, rotY));
        }
        const bin = row(-10, 8);
        const parasol = row(7, 8.5);
        add(prop(`${ROADS}/dumpster`, bin.x, bin.z, 1.8, 1.15, 1.2, true, rotY));
        add(prop(`${COM}/detail-parasol-a`, parasol.x, parasol.z, 2.2, 2.45, 2.2, false, rotY));
      }
    }
  }
  return placements;
}

export function streetProps(): Placement[] {
  const props: Placement[] = [];
  for (const road of ROAD_LINES) {
    for (const line of ROAD_LINES) {
      for (const offset of [10, 30]) {
        const z = line + offset;
        props.push(prop(`${ROADS}/electricity-pole`, road + 7.2, z, 1.6, 7, 0.45));
      }
    }
  }
  for (const road of ROAD_LINES) {
    if (road === 0) continue;
    props.push(
      prop(`${ROADS}/traffic-light`, road - 7.4, 7.4, 0.65, 4.2, 0.85),
      prop(`${ROADS}/traffic-light`, 7.4, road - 7.4, 0.65, 4.2, 0.85, false, QUARTER),
      prop(`${ROADS}/road-sign-street`, road + 8, -7.5, 2.2, 2.65, 0.55),
      prop(`${ROADS}/road-sign-street`, -8, road + 7.5, 2.2, 2.65, 0.55, false, QUARTER),
    );
  }
  return props;
}
