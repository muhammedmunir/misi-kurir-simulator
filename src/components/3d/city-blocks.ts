import { DELIVERY_ZONES, HOUSE } from "@/lib/delivery-system";
import { WAREHOUSE } from "@/warehouse/warehouse-logic";
import { buildingLayout } from "./city-layout";
import { emptyLotTrees } from "./kenney-building-model";
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
const HOUSE_MODELS = [`${SUB}/building-type-m`, `${SUB}/building-type-o`, `${SUB}/building-type-r`];
const SHOP_MODELS = [`${COM}/low-detail-building-c`, `${COM}/low-detail-building-j`];
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
      if (address) {
        keepClear.push(
          {
            box: placementFootprint(prop("", x, z + HOUSE.zOffset, HOUSE.width, HOUSE.height, HOUSE.depth)),
            gap: 2,
          },
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
        const offsets = address ? [-9.8, 9.8] : [-10.2, -3.4, 3.4, 10.2];
        offsets.forEach((dx, i) => {
          add(prop(pick(HOUSE_MODELS), x + dx, z + 3, 6, 4.5, 7, true));
          add(prop(`${SUB}/driveway-short`, x + dx, z + 10.4, 3.6, 0.08, 6));
          if (i % 2 === 0) add(prop(pick(CAR_MODELS), x + dx, z + 10.3, 1.9, 1.45, 4.1, true));
          const fenceX = dx + (dx > 0 ? 3.25 : -3.25);
          add(prop(`${SUB}/fence-low`, x + fenceX, z + 9.4, 5.8, 0.95, 0.2, true, QUARTER));
        });
        for (const dx of [-9, 0, 9]) {
          const tree = legacyTrees.find((t) => Math.abs(t.x - x - dx) < 2 && Math.abs(t.z - z + 8) < 2);
          add(
            prop(`${SUB}/${tree?.model ?? "tree-small"}`, x + dx, z - 8, tree?.w ?? 2.8, tree?.h ?? 4, tree?.d ?? 2.8),
          );
        }
      } else if (tower) {
        // Blok menara masih ada ruang di sudut walaupun tapaknya hampir memenuhi tengah blok.
        for (const [dx, dz] of [
          [-10.5, -10.5],
          [10.5, -10.5],
          [-10.5, 10.5],
          [10.5, 10.5],
        ]) {
          const added = add(prop(pick(HOUSE_MODELS), x + dx, z + dz, 5.2, 4, 5.2, true, dz < 0 ? Math.PI : 0));
          if (!added) add(prop(`${SUB}/tree-small`, x + dx, z + dz, 2.4, 3.5, 2.4));
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
          add(prop(pick(SHOP_MODELS), shop.x, shop.z, 6.6, 6 + Math.abs(u) / 5, 7, true, rotY));
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
        if (z < 150) props.push(prop(`${ROADS}/electricity-wires`, road + 7.2, z + 10, 1.1, 0.8, 20));
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
