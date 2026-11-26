/// <reference types="vite/client" />
/**
 * Kontrak Pelan 007 — asas pergerakan: watak di atas tanah, A/D ikut skrin,
 * collision watak dan motor dengan bangunan, rumah dan gudang.
 */
import { getWorldState, playerState, restoreWorld } from "@/components/3d/PlayerController";
import playerSrc from "@/components/3d/PlayerController.tsx?raw";
import { cameraObstacles } from "@/components/3d/camera-collision";
import {
  MOTOR_RADIUS,
  PLAYER_RADIUS,
  moveHeading,
  resolveCircle,
  warehouseColliders,
  worldColliders,
} from "@/components/3d/world-collision";
import { DELIVERY_ZONES } from "@/lib/delivery-system";
import { WAREHOUSE } from "@/warehouse/warehouse-logic";
import { describe, expect, it } from "vitest";

const BOX = { minX: 0, maxX: 4, minZ: 0, maxZ: 2 };

describe("moveHeading — input relatif kepada kamera", () => {
  it("W = arah kamera; tiada input = null", () => {
    expect(moveHeading(0.7, 1, 0)).toBeCloseTo(0.7);
    expect(moveHeading(0.7, 0, 0)).toBeNull();
    expect(moveHeading(0.7, 0.1, -0.1)).toBeNull();
  });

  it("D = kanan skrin. Kamera memandang +z → kanan skrin ialah −x", () => {
    const h = moveHeading(0, 0, 1) ?? Number.NaN;
    expect(Math.sin(h)).toBeCloseTo(-1);
    expect(Math.cos(h)).toBeCloseTo(0);
  });

  it("A = kiri skrin (+x bila kamera memandang +z); S = ke arah kamera", () => {
    const a = moveHeading(0, 0, -1) ?? Number.NaN;
    expect(Math.sin(a)).toBeCloseTo(1);
    const s = moveHeading(0, -1, 0) ?? Number.NaN;
    expect(Math.cos(s)).toBeCloseTo(-1);
  });

  it("kanan skrin = (−cos h, sin h) bagi sebarang arah kamera", () => {
    for (let i = 0; i < 12; i++) {
      const view = (i / 12) * Math.PI * 2;
      const h = moveHeading(view, 0, 1) ?? Number.NaN;
      expect(Math.sin(h)).toBeCloseTo(-Math.cos(view));
      expect(Math.cos(h)).toBeCloseTo(Math.sin(view));
    }
  });
});

describe("resolveCircle", () => {
  it("jauh dari kotak → tidak berubah, hit false", () => {
    expect(resolveCircle({ x: 10, z: 10 }, 0.5, [BOX])).toEqual({ x: 10, z: 10, hit: false });
  });

  it("bertindih dari luar → ditolak tepat sejauh jejari dari sisi", () => {
    const r = resolveCircle({ x: 2, z: 2.2 }, 0.5, [BOX]);
    expect(r.hit).toBe(true);
    expect(r.x).toBeCloseTo(2);
    expect(r.z).toBeCloseTo(2.5);
  });

  it("pusat di dalam kotak → keluar melalui sisi terdekat", () => {
    const r = resolveCircle({ x: 3.8, z: 1 }, 0.5, [BOX]);
    expect(r.x).toBeCloseTo(4.5);
    expect(r.z).toBeCloseTo(1);
  });
});

describe("worldColliders", () => {
  const all = worldColliders();

  it("meliputi setiap bangunan dan rumah (kotak kamera) serta gudang", () => {
    expect(all.length).toBe(cameraObstacles().length + warehouseColliders().length);
    for (const b of cameraObstacles()) {
      expect(all).toContainEqual({ minX: b.minX, maxX: b.maxX, minZ: b.minZ, maxZ: b.maxZ });
    }
  });

  it("pintu gudang terbuka; dinding depan di sebelahnya pejal", () => {
    const doorZ = WAREHOUSE.center.z - WAREHOUSE.depth / 2;
    expect(resolveCircle({ x: WAREHOUSE.center.x, z: doorZ }, MOTOR_RADIUS, all).hit).toBe(false);
    expect(resolveCircle({ x: WAREHOUSE.center.x + 6, z: doorZ }, PLAYER_RADIUS, all).hit).toBe(true);
  });

  it("tiada zon, kotak parkir atau titik mula yang terperangkap dalam halangan", () => {
    const points = [{ x: 0, z: 0 }, { x: 2, z: 2 }, ...DELIVERY_ZONES.map((z) => z.position)];
    for (const z of DELIVERY_ZONES) if (z.parking) points.push({ x: z.parking.x, z: z.parking.z });
    for (const p of points) {
      expect(resolveCircle(p, MOTOR_RADIUS, all).hit, JSON.stringify(p)).toBe(false);
    }
  });
});

describe("PlayerController", () => {
  it("watak berdiri di tanah (y = 0), bukan terapung 1.6", () => {
    restoreWorld({ pos: { x: 0, z: 0 }, onFoot: true, motor: { x: 2, z: 2, heading: 0 } });
    expect(playerState.getPosition().y).toBe(0);
    expect(playerSrc).not.toMatch(/pos\.[^\n]*\b1\.6\b/);
  });

  it("arah kamera berjalan kaki bermula dari arah motor selepas muat/teleport", () => {
    restoreWorld({ pos: { x: 0, z: 0 }, onFoot: true, motor: { x: 2, z: 2, heading: 1.2 } });
    expect(playerState.getHeading()).toBeCloseTo(1.2);
    expect(getWorldState().motor.heading).toBeCloseTo(1.2);
  });

  it("collision dipakai untuk watak dan motor; stereng kanan mengurangkan heading", () => {
    expect(playerSrc.match(/resolveCircle\(/g)?.length ?? 0).toBeGreaterThanOrEqual(3);
    expect(playerSrc).toMatch(/PLAYER_RADIUS/);
    expect(playerSrc).toMatch(/MOTOR_RADIUS/);
    expect(playerSrc).toMatch(/motor\.heading -=/);
  });
});
