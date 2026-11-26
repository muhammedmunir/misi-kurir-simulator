/// <reference types="vite/client" />
/**
 * Kontrak Pelan 010 — 9 alamat penghantaran, minimap dan kos render per alamat.
 */
import zonesSrc from "@/components/3d/DeliveryZones.tsx?raw";
import { destinationInstances } from "@/components/3d/Destinations";
import destinationsSrc from "@/components/3d/Destinations.tsx?raw";
import { buildingLayout } from "@/components/3d/city-layout";
import receiverSrc from "@/delivery/Receiver.tsx?raw";
import { DELIVERY_ZONES, HOUSE } from "@/lib/delivery-system";
import { MINIMAP_RANGE, clampToRadius, toMinimap } from "@/navigation/minimap-math";
import { describe, expect, it } from "vitest";

const dest = DELIVERY_ZONES.filter((z) => z.type === "delivery");

describe("alamat", () => {
  it("9 alamat, setiap satu di lot blok sendiri (gx·40 + 20)", () => {
    expect(dest).toHaveLength(9);
    const lots = new Set<string>();
    for (const z of dest) {
      expect(z.lot, z.id).toBeDefined();
      const { x, z: lz } = z.lot ?? { x: 0, z: 0 };
      expect(Number.isInteger((x - 20) / 40), z.id).toBe(true);
      expect(Number.isInteger((lz - 20) / 40), z.id).toBe(true);
      lots.add(`${x},${lz}`);
    }
    expect(lots.size).toBe(9);
  });

  it("jalan di hadapan setiap rumah wujud (lot.z + 20 ≤ 120)", () => {
    for (const z of dest) expect((z.lot?.z ?? 999) + 20, z.id).toBeLessThanOrEqual(120);
  });

  it("tiada rumah alamat bertindih dengan bangunan bandar", () => {
    const bs = buildingLayout();
    for (const z of dest) {
      if (!z.lot) continue;
      const hx = [z.lot.x - HOUSE.width / 2, z.lot.x + HOUSE.width / 2];
      const hz = [z.lot.z + HOUSE.zOffset - HOUSE.depth / 2, z.lot.z + HOUSE.zOffset + HOUSE.depth / 2];
      for (const b of bs) {
        const overlap =
          hx[0] < b.x + b.width / 2 &&
          hx[1] > b.x - b.width / 2 &&
          hz[0] < b.z + b.depth / 2 &&
          hz[1] > b.z - b.depth / 2;
        expect(overlap, `${z.id} vs bangunan (${b.x.toFixed(1)}, ${b.z.toFixed(1)})`).toBe(false);
      }
    }
  });

  it("sekurang-kurangnya 8 alamat mempunyai penerima di rumah", () => {
    expect(dest.filter((z) => z.receiverHome !== false).length).toBeGreaterThanOrEqual(8);
  });
});

describe("kos render alamat", () => {
  it("rumah dan kotak parkir dilukis dengan instancing (5 instancedMesh, bukan mesh per alamat)", () => {
    expect(destinationsSrc.match(/<instancedMesh\b/g) ?? []).toHaveLength(5);
    expect(destinationsSrc).not.toMatch(/<mesh\b/);
    const inst = destinationInstances();
    expect(inst.bodies).toHaveLength(9);
    expect(inst.lines).toHaveLength(36);
  });

  it("penerima: 2 instancedMesh untuk semua", () => {
    expect(receiverSrc.match(/<instancedMesh\b/g) ?? []).toHaveLength(2);
  });

  it("tiada pointLight per zon; penanda alamat hanya bila ada paket", () => {
    expect(zonesSrc).not.toMatch(/pointLight/);
    expect(zonesSrc).toMatch(/zone\.type === "delivery" && !isActive\) return null/);
  });
});

describe("minimap", () => {
  it("arah hadapan ke atas: sasaran di hadapan → y negatif; kanan skrin → x positif", () => {
    const p = { x: 10, z: 10 };
    for (const h of [0, 0.7, Math.PI / 2, 2.5, -1.2]) {
      const ahead = toMinimap({ x: p.x + Math.sin(h) * 30, z: p.z + Math.cos(h) * 30 }, p, h);
      expect(ahead.x).toBeCloseTo(0);
      expect(ahead.y).toBeCloseTo(-30);
      const right = toMinimap({ x: p.x - Math.cos(h) * 20, z: p.z + Math.sin(h) * 20 }, p, h);
      expect(right.x).toBeCloseTo(20);
      expect(right.y).toBeCloseTo(0);
    }
  });

  it("sasaran jauh diletakkan di tepi bulatan", () => {
    const c = clampToRadius({ x: 300, y: -400 }, 50);
    expect(Math.hypot(c.x, c.y)).toBeCloseTo(50);
    expect(c.clamped).toBe(true);
    expect(clampToRadius({ x: 3, y: 4 }, 50)).toEqual({ x: 3, y: 4, clamped: false });
    expect(MINIMAP_RANGE).toBeGreaterThan(50);
  });
});
