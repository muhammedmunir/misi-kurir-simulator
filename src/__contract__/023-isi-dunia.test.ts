/// <reference types="vite/client" />
/**
 * Pelan 023 — isi dunia (kepadatan blok + perabot jalan). Ditulis oleh perancang. C9 TIDAK boleh menyunting fail ini.
 *
 * Blok: pusat = garis jalan + 20 (ROAD_LINES), dalaman blok = pusat ±14 (jalan selebar 12 pada garis).
 * Placement.rotY mesti gandaan π/2; bila ±π/2, lebar (w) dan dalam (d) bertukar paksi.
 */
import { cameraObstacles } from "@/components/3d/camera-collision";
import { type Placement, blockPlacements, streetProps } from "@/components/3d/city-blocks";
import { buildingLayout } from "@/components/3d/city-layout";
import { ROAD_LINES } from "@/components/3d/road-tiles";
import { worldColliders } from "@/components/3d/world-collision";
import gameSceneSrc from "@/components/GameScene3D.tsx?raw";
import { DELIVERY_ZONES } from "@/lib/delivery-system";
import { WAREHOUSE } from "@/warehouse/warehouse-logic";
import { describe, expect, it } from "vitest";

/** Fail GLB dalam public/models/ (tsconfig tiada jenis Node, jadi guna import.meta.glob dan bukan node:fs). */
const MODEL_FILES = new Set(Object.keys(import.meta.glob("/public/models/**/*.glb")));

type Box = { minX: number; maxX: number; minZ: number; maxZ: number };

const HALF_BLOCK = 14;
const centres = ROAD_LINES.map((l) => l + 20);
const blocks = centres.flatMap((x) => centres.map((z) => ({ x, z })));
const blockOf = (x: number, z: number) =>
  blocks.find((b) => Math.abs(b.x - x) <= HALF_BLOCK + 1e-6 && Math.abs(b.z - z) <= HALF_BLOCK + 1e-6);
const isWarehouseBlock = (b: { x: number; z: number }) => b.x === WAREHOUSE.center.x && b.z === WAREHOUSE.center.z;

function box(p: Placement): Box {
  const quarter = Math.round(p.rotY / (Math.PI / 2));
  const swap = Math.abs(quarter) % 2 === 1;
  const w = swap ? p.d : p.w;
  const d = swap ? p.w : p.d;
  return { minX: p.x - w / 2, maxX: p.x + w / 2, minZ: p.z - d / 2, maxZ: p.z + d / 2 };
}
const overlap = (a: Box, b: Box, gap = 0) =>
  a.minX < b.maxX + gap && b.minX < a.maxX + gap && a.minZ < b.maxZ + gap && b.minZ < a.maxZ + gap;

const placements = blockPlacements();
const solid = placements.filter((p) => p.solid);
const deliveryLots = DELIVERY_ZONES.filter((z) => z.type === "delivery" && z.lot);
const houseBoxes = cameraObstacles().slice(buildingLayout().length, buildingLayout().length + deliveryLots.length);
const cityBoxes: Box[] = buildingLayout().map((b) => ({
  minX: b.x - b.width / 2,
  maxX: b.x + b.width / 2,
  minZ: b.z - b.depth / 2,
  maxZ: b.z + b.depth / 2,
}));

describe("blockPlacements() — blok bandar diisi, bukan padang kosong", () => {
  it("deterministik dan rotY gandaan π/2", () => {
    expect(blockPlacements()).toEqual(placements);
    for (const p of placements) {
      const q = p.rotY / (Math.PI / 2);
      expect(Math.abs(q - Math.round(q))).toBeLessThan(1e-9);
    }
  });

  it("setiap model wujud dalam public/models/ (disalin daripada arkib Kenney dalam assets-src/)", () => {
    for (const p of [...placements, ...streetProps()]) {
      expect(p.model).toMatch(/^(city-kit-suburban|city-kit-commercial|city-kit-roads|car-kit)\/[a-z0-9-]+$/);
      expect(MODEL_FILES.has(`/public/models/${p.model}.glb`), p.model).toBe(true);
    }
  });

  it("semua placement di dalam blok (tidak di atas jalan) dan bukan di blok gudang", () => {
    for (const p of placements) {
      const b = box(p);
      const blk = blockOf(p.x, p.z);
      expect(blk, `${p.model} @ ${p.x},${p.z}`).toBeDefined();
      if (!blk) continue;
      expect(isWarehouseBlock(blk)).toBe(false);
      expect(b.minX).toBeGreaterThanOrEqual(blk.x - HALF_BLOCK);
      expect(b.maxX).toBeLessThanOrEqual(blk.x + HALF_BLOCK);
      expect(b.minZ).toBeGreaterThanOrEqual(blk.z - HALF_BLOCK);
      expect(b.maxZ).toBeLessThanOrEqual(blk.z + HALF_BLOCK);
    }
  });

  it("placement pejal tidak bertindih sesama sendiri, bangunan bandar atau rumah alamat (jarak 2 m)", () => {
    for (let i = 0; i < solid.length; i++) {
      for (let j = i + 1; j < solid.length; j++) {
        expect(overlap(box(solid[i]), box(solid[j])), `${solid[i].model} ↔ ${solid[j].model}`).toBe(false);
      }
      for (const c of cityBoxes) expect(overlap(box(solid[i]), c, 1)).toBe(false);
      for (const h of houseBoxes) expect(overlap(box(solid[i]), h, 2)).toBe(false);
    }
  });

  it("laluan dari jalan ke pintu setiap alamat kekal lapang (koridor ±3 m di hadapan pintu)", () => {
    for (const z of deliveryLots) {
      const blk = blockOf(z.position.x, z.position.z);
      if (!blk) continue;
      const corridor: Box = {
        minX: z.position.x - 3,
        maxX: z.position.x + 3,
        minZ: z.position.z - 1,
        maxZ: blk.z + HALF_BLOCK,
      };
      for (const p of solid) expect(overlap(box(p), corridor), `${p.model} menghalang ${z.id}`).toBe(false);
    }
  });

  it("kepadatan: setiap blok (kecuali gudang) ada ≥ 3 bangunan (placement building-* + bangunan bandar + rumah alamat)", () => {
    for (const blk of blocks.filter((b) => !isWarehouseBlock(b))) {
      const inBlock = (x: number, z: number) => blockOf(x, z) === blk;
      const n =
        placements.filter((p) => /\/(low-detail-)?building-/.test(p.model) && inBlock(p.x, p.z)).length +
        buildingLayout().filter((b) => inBlock(b.x, b.z)).length +
        deliveryLots.filter((z) => z.lot && inBlock(z.lot.x, z.lot.z)).length;
      expect(n, `blok ${blk.x},${blk.z}`).toBeGreaterThanOrEqual(3);
    }
  });

  it("ada pagar, laluan kereta dan kereta diparkir (suasana taman perumahan)", () => {
    const has = (re: RegExp) => placements.filter((p) => re.test(p.model)).length;
    expect(has(/\/fence/)).toBeGreaterThanOrEqual(20);
    expect(has(/\/driveway/)).toBeGreaterThanOrEqual(10);
    expect(has(/^car-kit\/(sedan|hatchback-sports|suv|van|taxi|delivery)$/)).toBeGreaterThanOrEqual(10);
  });
});

describe("streetProps() — perabot jalan Malaysia", () => {
  const props = streetProps();
  const nearestRoad = (v: number) => Math.min(...ROAD_LINES.map((l) => Math.abs(v - l)));

  it("tiang elektrik di tepi jalan (≥ 30), di bahu jalan dan bukan di atas jalan", () => {
    const poles = props.filter((p) => /electricity-pole/.test(p.model));
    expect(poles.length).toBeGreaterThanOrEqual(30);
    for (const p of poles) {
      const off = Math.min(nearestRoad(p.x), nearestRoad(p.z));
      expect(off).toBeGreaterThanOrEqual(6);
      expect(off).toBeLessThanOrEqual(9);
    }
  });

  it("lampu isyarat di sekurang-kurangnya 4 persimpangan", () => {
    const lights = props.filter((p) => /traffic-light/.test(p.model));
    const junctions = new Set(
      lights.map((p) => {
        const jx = ROAD_LINES.reduce((a, l) => (Math.abs(l - p.x) < Math.abs(a - p.x) ? l : a));
        const jz = ROAD_LINES.reduce((a, l) => (Math.abs(l - p.z) < Math.abs(a - p.z) ? l : a));
        return `${jx},${jz}`;
      }),
    );
    expect(junctions.size).toBeGreaterThanOrEqual(4);
  });
});

describe("sambungan: perlanggaran, kamera dan render", () => {
  const tall = solid.filter((p) => p.h >= 2);

  it("cameraObstacles() menyertakan setiap placement pejal tinggi (≥ 2 m)", () => {
    const boxes = cameraObstacles();
    expect(boxes.length).toBe(buildingLayout().length + deliveryLots.length + tall.length);
    for (const p of tall) {
      const b = box(p);
      expect(boxes.some((o) => Math.abs(o.minX - b.minX) < 1e-6 && Math.abs(o.maxZ - b.maxZ) < 1e-6)).toBe(true);
    }
  });

  it("worldColliders() menyekat setiap placement pejal (termasuk pagar)", () => {
    const rects = worldColliders();
    for (const p of solid) {
      const b = box(p);
      expect(rects.some((r) => Math.abs(r.minX - b.minX) < 1e-6 && Math.abs(r.minZ - b.minZ) < 1e-6)).toBe(true);
    }
  });

  it("GameScene3D merender CityBlocks dan StreetProps", () => {
    expect(gameSceneSrc).toMatch(/<CityBlocks\s*\/>/);
    expect(gameSceneSrc).toMatch(/<StreetProps\s*\/>/);
  });
});
