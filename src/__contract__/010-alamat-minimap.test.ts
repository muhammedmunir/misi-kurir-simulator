/// <reference types="vite/client" />
/**
 * Kontrak Pelan 010 — 9 alamat penghantaran, minimap dan kos render per alamat.
 */
import zonesSrc from "@/components/3d/DeliveryZones.tsx?raw";
import { destinationInstances } from "@/components/3d/Destinations";
import destinationsSrc from "@/components/3d/Destinations.tsx?raw";
import { cameraObstacles } from "@/components/3d/camera-collision";
import { buildingLayout } from "@/components/3d/city-layout";
import receiverSrc from "@/delivery/Receiver.tsx?raw";
import { DELIVERY_ZONES } from "@/lib/delivery-system";
import { MINIMAP_RANGE, clampToRadius, toMinimap } from "@/navigation/minimap-math";
import { describe, expect, it } from "vitest";

const dest = DELIVERY_ZONES.filter((z) => z.type === "delivery");
const obstacles = cameraObstacles();
const houseOf = (id: string) => destinationInstances().bodies[dest.findIndex((z) => z.id === id)];

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
      // Pelan 025 (dikemas kini oleh perancang): saiz rumah ikut model GLB, bukan HOUSE tetap.
      const h = houseOf(z.id);
      const hx = [h.x - h.w / 2, h.x + h.w / 2];
      const hz = [h.z - h.d / 2, h.z + h.d / 2];
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
  // Pelan 016 (dikemas kini oleh perancang): rumah alamat kini model GLB Kenney City Kit
  // (Suburban), satu instancedMesh bagi setiap jenis model, diletakkan dengan fitMatrix pada
  // kotak rumah yang sama (collision dan kamera bergantung padanya). Garisan dan pad parkir
  // kekal sebagai dua instancedMesh satah. Seperti kontrak 11b untuk Buildings.tsx.
  it("rumah: GLB Kenney melalui useMergedModels + fitMatrix, instancing ikut model, dalam Suspense", () => {
    expect(destinationsSrc).toMatch(/useMergedModels\(/);
    expect(destinationsSrc).toMatch(/fitMatrix\(/);
    expect(destinationsSrc).toMatch(/<Suspense\b/);
    expect(destinationsSrc).toMatch(/\/models\/city-kit-suburban\//);
    expect(destinationsSrc).toMatch(/\.map\([\s\S]*?<instancedMesh\b/);
    expect(destinationsSrc).not.toMatch(/<mesh\b/);
    expect(destinationsSrc).not.toMatch(/<boxGeometry\b/);
    expect(destinationsSrc).not.toMatch(/<coneGeometry\b/);
  });

  it("setiap rumah mengisi kotak rumah asal dan menghadap +z (pintu ke arah zon)", () => {
    const houses = destinationInstances().bodies;
    expect(houses).toHaveLength(9);
    dest.forEach((z, i) => {
      const h = houses[i];
      // Pelan 025 (dikemas kini oleh perancang): w/h/d = saiz model × faktor skala (diuji kontrak 025),
      // jadi di sini hanya kedudukan dalam lot dan kotak kamera yang sama saiz.
      expect(h.model, z.id).toMatch(/^building-type-[a-u]$/);
      expect(h.x).toBe(z.lot?.x);
      const lz = z.lot?.z ?? Number.NaN;
      expect(h.z - h.d / 2, z.id).toBeGreaterThanOrEqual(lz - 14);
      expect(Math.abs(h.x - (z.lot?.x ?? Number.NaN)) + h.w / 2, z.id).toBeLessThanOrEqual(14);
      expect(
        obstacles.some(
          (o) =>
            Math.abs(o.minX - (h.x - h.w / 2)) < 1e-6 &&
            Math.abs(o.maxX - (h.x + h.w / 2)) < 1e-6 &&
            Math.abs(o.minZ - (h.z - h.d / 2)) < 1e-6 &&
            Math.abs(o.maxZ - (h.z + h.d / 2)) < 1e-6 &&
            Math.abs(o.maxY - h.h) < 1e-6,
        ),
        `${z.id}: cameraObstacles mengikut saiz rumah`,
      ).toBe(true);
      // Model Kenney menghadap +z; tiada putaran (atau putaran 0) = pintu menghadap zon di z lebih besar.
      expect((h as { rotY?: number }).rotY ?? 0).toBe(0);
      expect(z.position.z).toBeGreaterThan(h.z + h.d / 2);
    });
  });

  it("garisan dan pad parkir kekal instanced (2 instancedMesh satah, 36 garisan, 9 pad)", () => {
    const inst = destinationInstances();
    expect(inst.lines).toHaveLength(36);
    expect(inst.pads).toHaveLength(9);
    expect(destinationsSrc.match(/<instancedMesh ref=\{(lineRef|padRef)\}/g) ?? []).toHaveLength(2);
    expect(destinationsSrc.match(/<planeGeometry\b/g) ?? []).toHaveLength(2);
  });

  // Pelan 012a: penerima kini watak GLB beranimasi; hanya yang berdekatan dilukis.
  it("penerima: watak GLB, dihadkan kepada yang berdekatan dengan pemain", () => {
    expect(receiverSrc).toMatch(/<CharacterGLB /);
    expect(receiverSrc).toMatch(/visibleReceivers\(/);
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
