/// <reference types="vite/client" />
/**
 * Kontrak Pelan 015 — kereta trafik ialah model GLB Kenney Car Kit (CC0),
 * dilukis dengan instancing (satu instancedMesh bagi setiap jenis kereta).
 * Ditulis oleh perancang. C9 TIDAK boleh menyunting fail ini.
 */
import npcSrc from "@/components/3d/NPCTraffic.tsx?raw";
import { CAR_MODELS, carModelFor } from "@/components/3d/car-models";
import { describe, expect, it } from "vitest";

const NODE_FS = "node:fs";
type NodeFs = { existsSync(path: string): boolean };
const { existsSync } = (await import(/* @vite-ignore */ NODE_FS)) as NodeFs;

describe("senarai model kereta", () => {
  it("4–7 model, semuanya fail GLB dalam public/models/car-kit/ (bukan kereta polis)", () => {
    expect(CAR_MODELS.length).toBeGreaterThanOrEqual(4);
    expect(CAR_MODELS.length).toBeLessThanOrEqual(7);
    for (const url of CAR_MODELS) {
      expect(url).toMatch(/^\/models\/car-kit\/[a-z-]+\.glb$/);
      expect(existsSync(`public${url}`), url).toBe(true);
      expect(url).not.toMatch(/police/);
    }
    expect(new Set(CAR_MODELS).size).toBe(CAR_MODELS.length);
  });

  it("carModelFor: deterministik, kitaran melalui semua model", () => {
    const n = CAR_MODELS.length;
    for (let i = 0; i < n * 3; i++) {
      expect(carModelFor(i)).toBe(i % n);
      expect(carModelFor(i)).toBe(carModelFor(i));
    }
  });
});

describe("NPCTraffic.tsx", () => {
  it("memuat model melalui useMergedModels dan meletakkannya dengan fitMatrix", () => {
    expect(npcSrc).toMatch(/useMergedModels\(/);
    expect(npcSrc).toMatch(/fitMatrix\(/);
    expect(npcSrc).toMatch(/CAR_MODELS/);
  });

  it("tiada lagi kereta kotak (tiada boxGeometry/cylinderGeometry)", () => {
    expect(npcSrc).not.toMatch(/<boxGeometry/);
    expect(npcSrc).not.toMatch(/<cylinderGeometry/);
  });

  it("logik trafik kekal: updateNPCTraffic dengan pemain, setLiveTraffic, tiada bayang", () => {
    expect(npcSrc).toMatch(/updateNPCTraffic\([\s\S]*?player:\s*playerState\.getPosition\(\)/);
    expect(npcSrc).toMatch(/setLiveTraffic\(/);
    expect(npcSrc).toMatch(/noCastShadow: true/);
  });
});
