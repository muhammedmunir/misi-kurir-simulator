/// <reference types="vite/client" />
/**
 * Kontrak Pelan 005 Langkah 12 — B14 (kamera masuk rumah) dan B21 (penunjuk arah menutup panel).
 * Ditulis oleh perancang. C9 TIDAK boleh menyunting fail ini.
 *
 * Konvensyen arah: hadapan = (sin h, cos h). Kamera di belakang = kedudukan − 8 × hadapan.
 * Rumah alamat (HOUSE): lebar 8, tinggi 5 (+ bumbung 1.4), dalam 6, pusat lot.z + 4; pintu lot.z + 9.
 */
import cameraSrc from "@/components/3d/CameraFollow.tsx?raw";
import { type Aabb, cameraObstacles, clampCamera } from "@/components/3d/camera-collision";
import { blockPlacements } from "@/components/3d/city-blocks";
import { buildingLayout } from "@/components/3d/city-layout";
import { DELIVERY_ZONES } from "@/lib/delivery-system";
import { NavArrow } from "@/navigation/NavArrow";
import { useDeliveryStore } from "@/store/delivery";
import { SHOP, deliveringTo } from "@/test/delivery-fixtures";
import { act } from "react";
import { type Root, createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

type P3 = { x: number; y: number; z: number };

const EPS = 1e-6;
const strictlyInside = (p: P3, b: Aabb) =>
  p.x > b.minX + EPS &&
  p.x < b.maxX - EPS &&
  p.y > b.minY + EPS &&
  p.y < b.maxY - EPS &&
  p.z > b.minZ + EPS &&
  p.z < b.maxZ - EPS;
const dist = (a: P3, b: P3) => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);

const deliveryLots = DELIVERY_ZONES.filter((z) => z.type === "delivery" && z.lot);

describe("cameraObstacles() — bangunan dan rumah alamat", () => {
  const boxes = cameraObstacles();

  it("satu kotak bagi setiap bangunan bandar dan setiap rumah alamat; gudang tidak termasuk", () => {
    // Pelan 023 (dikemas kini oleh perancang): ditambah placement blok pejal setinggi ≥ 2 m, dilampirkan selepas rumah alamat.
    const tall = blockPlacements().filter((p) => p.solid && p.h >= 2).length;
    expect(boxes).toHaveLength(buildingLayout().length + deliveryLots.length + tall);
  });

  it("kotak bangunan = badan bangunan (lantai hingga bumbung)", () => {
    for (const b of buildingLayout()) {
      expect(boxes).toContainEqual({
        minX: b.x - b.width / 2,
        maxX: b.x + b.width / 2,
        minY: 0,
        maxY: b.height,
        minZ: b.z - b.depth / 2,
        maxZ: b.z + b.depth / 2,
      });
    }
  });

  it("rumah Kedai Runcit Mak Minah (lot 60, 20): x 56–64, y 0–6.4, z 21–27", () => {
    const house = boxes.find((b) => b.minX === 56 && b.maxX === 64 && b.minZ === 21);
    expect(house).toBeDefined();
    expect(house?.maxZ).toBe(27);
    expect(house?.minY).toBe(0);
    expect(house?.maxY).toBeCloseTo(6.4, 9);
  });
});

describe("clampCamera(eye, desired, boxes)", () => {
  const boxes = cameraObstacles();

  it("tiada halangan → kedudukan diingini dikembalikan tanpa perubahan", () => {
    const eye = { x: 0, y: 1, z: 0 };
    const desired = { x: 0, y: 3, z: -8 };
    expect(clampCamera(eye, desired, boxes)).toEqual(desired);
  });

  it("B14: berdiri di pintu Mak Minah menghadap jalan → kamera di luar rumah, antara pemain dan dinding", () => {
    const eye = { x: 60, y: 1, z: 29 };
    const desired = { x: 60, y: 3, z: 21 };
    const cam = clampCamera(eye, desired, boxes);
    for (const b of boxes) expect(strictlyInside(cam, b)).toBe(false);
    expect(cam.z).toBeGreaterThan(27);
    expect(cam.z).toBeLessThan(29);
    // Kekal di atas segmen eye → desired
    expect(dist(eye, cam) + dist(cam, desired)).toBeCloseTo(dist(eye, desired), 6);
    // Ruang ≥ 0.2 unit dari dinding supaya satah dekat kamera tidak memotong dinding
    expect(cam.z - 27).toBeGreaterThanOrEqual(0.2);
  });

  it("setiap pintu alamat, 16 arah: kamera tidak pernah di dalam mana-mana kotak", () => {
    for (const zone of deliveryLots) {
      for (let i = 0; i < 16; i++) {
        const h = (i / 16) * Math.PI * 2;
        const eye = { x: zone.position.x, y: 1, z: zone.position.z };
        const desired = { x: eye.x - Math.sin(h) * 8, y: 3, z: eye.z - Math.cos(h) * 8 };
        const cam = clampCamera(eye, desired, boxes);
        for (const b of boxes) expect(strictlyInside(cam, b), `${zone.id} arah ${i}`).toBe(false);
        expect(dist(eye, cam) + dist(cam, desired)).toBeCloseTo(dist(eye, desired), 6);
      }
    }
  });
});

describe("CameraFollow memakai clampCamera", () => {
  it("import dari ./camera-collision; halangan dikira sekali di peringkat modul; clampCamera dalam useFrame", () => {
    expect(cameraSrc).toMatch(/from "\.\/camera-collision"/);
    const body = cameraSrc.indexOf("export function CameraFollow");
    const obstacles = cameraSrc.indexOf("cameraObstacles()");
    expect(obstacles).toBeGreaterThan(-1);
    expect(obstacles).toBeLessThan(body);
    expect(cameraSrc.indexOf("clampCamera(")).toBeGreaterThan(cameraSrc.indexOf("useFrame("));
  });
});

describe("B21: NavArrow disembunyikan semasa panel Serah Terima terbuka", () => {
  let container: HTMLDivElement;
  let root: Root;
  const handover = { packetId: "pkt-0", zoneId: SHOP.id, proofTaken: false };

  beforeEach(() => {
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    vi.useFakeTimers();
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    useDeliveryStore.getState().reset();
    vi.useRealTimers();
  });

  it("handover aktif semasa render pertama → tiada penunjuk arah", () => {
    useDeliveryStore.setState({ session: { ...deliveringTo([SHOP]), handover } });
    act(() => root.render(<NavArrow />));
    expect(container.querySelector(".nav-hud")).toBeNull();
  });

  it("panel dibuka selepas render → hilang dalam 150 ms; panel ditutup → muncul semula", () => {
    useDeliveryStore.setState({ session: deliveringTo([SHOP]) });
    act(() => root.render(<NavArrow />));
    expect(container.querySelector(".nav-hud")).not.toBeNull();

    act(() => {
      useDeliveryStore.setState({ session: { ...useDeliveryStore.getState().session, handover } });
      vi.advanceTimersByTime(150);
    });
    expect(container.querySelector(".nav-hud")).toBeNull();

    act(() => {
      useDeliveryStore.setState({ session: { ...useDeliveryStore.getState().session, handover: null } });
      vi.advanceTimersByTime(150);
    });
    expect(container.querySelector(".nav-hud")).not.toBeNull();
  });
});
