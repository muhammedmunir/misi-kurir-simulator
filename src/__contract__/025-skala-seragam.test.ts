/// <reference types="vite/client" />
/**
 * Pelan 025 — skala dunia seragam. Ditulis oleh perancang. C9 TIDAK boleh menyunting fail ini.
 *
 * Masalah: setiap model Kenney diregang (fitMatrix) ke kotak sembarangan, jadi pintu, tingkap dan kereta
 * berlainan saiz dan nisbah. Watak 1.75 m nampak salah saiz berbanding dunia.
 *
 * Skala setiap paksi = saiz sasaran / saiz asli model (paksi setempat model, sebelum putaran):
 *   sx = w / asli.x, sy = h / asli.y, sz = d / asli.z.
 * Saiz asli dibaca terus daripada blok JSON fail GLB (had accessor POSITION), bukan daripada kod C9.
 */
import npcTrafficSrc from "@/components/3d/NPCTraffic.tsx?raw";
import { trafficCarSize } from "@/components/3d/car-models";
import { type Placement, blockPlacements } from "@/components/3d/city-blocks";
import { buildingLayout } from "@/components/3d/city-layout";
import { commercialBuildingModel, destinationHouses } from "@/components/3d/kenney-building-model";
import { describe, expect, it } from "vitest";

const RAW = import.meta.glob("/public/models/**/*.glb", { query: "?raw", import: "default", eager: true }) as Record<
  string,
  string
>;

type V3 = [number, number, number];

/** Saiz asli (x, y, z) model daripada blok JSON GLB. */
function nativeSize(model: string): V3 {
  const raw = RAW[`/public/models/${model}.glb`];
  if (!raw) throw new Error(`model tiada: ${model}`);
  // Blok JSON bermula pada '{' pertama; cari '}' penutup dengan imbasan kurungan (abaikan isi rentetan).
  const start = raw.indexOf("{");
  let depth = 0;
  let inString = false;
  let end = start;
  for (let i = start; i < raw.length; i++) {
    const c = raw[i];
    if (inString) {
      if (c === "\\") i++;
      else if (c === '"') inString = false;
    } else if (c === '"') inString = true;
    else if (c === "{") depth++;
    else if (c === "}" && --depth === 0) {
      end = i;
      break;
    }
  }
  const gltf = JSON.parse(raw.slice(start, end + 1)) as {
    meshes: { primitives: { attributes: { POSITION: number } }[] }[];
    accessors: { min: number[]; max: number[] }[];
  };
  const min: V3 = [Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY];
  const max: V3 = [Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY];
  for (const mesh of gltf.meshes)
    for (const p of mesh.primitives) {
      const a = gltf.accessors[p.attributes.POSITION];
      for (let k = 0; k < 3; k++) {
        min[k] = Math.min(min[k], a.min[k]);
        max[k] = Math.max(max[k], a.max[k]);
      }
    }
  return [max[0] - min[0], max[1] - min[1], max[2] - min[2]];
}

function scales(model: string, w: number, h: number, d: number): V3 {
  const n = nativeSize(model);
  return [w / n[0], h / n[1], d / n[2]];
}
/** Nisbah skala terbesar/terkecil antara paksi (1 = seragam sempurna). */
const anisotropy = (s: V3) => Math.max(...s) / Math.min(...s);
const mean = (s: V3) => (s[0] + s[1] + s[2]) / 3;

const SUB = "city-kit-suburban";
const COM = "city-kit-commercial";
const isHouse = (p: Placement) => /\/building-type-/.test(p.model);

const houses = [
  ...blockPlacements().filter(isHouse),
  ...destinationHouses().map((h) => ({ ...h, model: `${SUB}/${h.model}` })),
];
const shops = blockPlacements().filter((p) => /\/(low-detail-)?building-[a-n]$/.test(p.model));
const city = buildingLayout().map((b, i) => ({
  model: `${COM}/${commercialBuildingModel(b.height, i)}`,
  w: b.width,
  h: b.height,
  d: b.depth,
}));
const cars = blockPlacements().filter((p) => p.model.startsWith("car-kit/"));

describe("rumah (Kenney suburban): skala seragam dan sama untuk semua rumah", () => {
  it("tiada rumah diregang: nisbah skala antara paksi ≤ 1.04", () => {
    expect(houses.length).toBeGreaterThan(0);
    for (const h of houses) expect(anisotropy(scales(h.model, h.w, h.h, h.d)), h.model).toBeLessThanOrEqual(1.04);
  });

  it("semua rumah berkongsi satu faktor skala (pintu sama tinggi), dalam julat 5–8", () => {
    const s = houses.map((h) => mean(scales(h.model, h.w, h.h, h.d)));
    const lo = Math.min(...s);
    const hi = Math.max(...s);
    expect(hi / lo).toBeLessThanOrEqual(1.05);
    expect(lo).toBeGreaterThanOrEqual(5);
    expect(hi).toBeLessThanOrEqual(8);
  });
});

describe("bangunan komersial (Kenney commercial): skala seragam dan sama", () => {
  const all = [...city, ...shops];
  it("nisbah skala antara paksi ≤ 1.04 bagi setiap bangunan bandar dan kedai", () => {
    for (const b of all) expect(anisotropy(scales(b.model, b.w, b.h, b.d)), b.model).toBeLessThanOrEqual(1.04);
  });

  it("satu faktor skala untuk semua (tingkap sama saiz), ±10%", () => {
    const s = all.map((b) => mean(scales(b.model, b.w, b.h, b.d)));
    expect(Math.max(...s) / Math.min(...s)).toBeLessThanOrEqual(1.1);
  });
});

describe("kereta: saiz sebenar dan sama antara parkir dan trafik", () => {
  it("kereta diparkir: panjang 3.8–4.8 m, lebar 1.7–1.95 m, tinggi 1.4–2.0 m", () => {
    expect(cars.length).toBeGreaterThan(0);
    for (const c of cars) {
      expect(c.d, c.model).toBeGreaterThanOrEqual(3.8);
      expect(c.d, c.model).toBeLessThanOrEqual(4.8);
      expect(c.w, c.model).toBeGreaterThanOrEqual(1.7);
      expect(c.w, c.model).toBeLessThanOrEqual(1.95);
      expect(c.h, c.model).toBeGreaterThanOrEqual(1.4);
      expect(c.h, c.model).toBeLessThanOrEqual(2.0);
    }
  });

  it("trafikCarSize(model) = saiz kereta diparkir model yang sama; NPCTraffic menggunakannya", () => {
    for (const c of cars) {
      const t = trafficCarSize(c.model);
      expect(t.w).toBeCloseTo(c.w, 6);
      expect(t.h).toBeCloseTo(c.h, 6);
      expect(t.d).toBeCloseTo(c.d, 6);
    }
    expect(npcTrafficSrc).toMatch(/trafficCarSize\(/);
    expect(npcTrafficSrc).not.toMatch(/CAR_LENGTH\s*=\s*3(\.0)?\b/);
  });
});
