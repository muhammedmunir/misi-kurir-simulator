import { describe, expect, it } from "vitest";
import { type Aabb, cameraObstacles, clampCamera, containing, occluders } from "./camera-collision";
import { destinationHouses } from "./kenney-building-model";

const eye = { x: 0, y: 1, z: 0 };
const cam = { x: 0, y: 3, z: -8 };
const box = (minZ: number, maxZ: number): Aabb => ({ minX: -1, maxX: 1, minY: 0, maxY: 4, minZ, maxZ });

describe("occluders", () => {
  it("memulangkan indeks semua kotak pada segmen, bukan yang di belakang kamera atau mata", () => {
    expect(occluders(eye, cam, [box(-11, -9), box(-7, -6), box(1, 3), box(-4, -3)])).toEqual([1, 3]);
  });

  it("mengira kotak yang mengandungi kamera atau mata", () => {
    expect(occluders(eye, cam, [box(-9, -7), box(-1, 1)])).toEqual([0, 1]);
  });

  it("menolak kotak di sisi atau di bawah segmen", () => {
    expect(
      occluders(eye, cam, [
        { ...box(-5, -4), minX: 2, maxX: 3 },
        { ...box(-5, -4), maxY: 1 },
      ]),
    ).toEqual([]);
  });

  it("tidak melutsinarkan apa-apa untuk segmen panjang sifar", () => {
    expect(occluders(eye, eye, [box(-1, 1)])).toEqual([]);
  });

  it("mengesan rumah Mak Minah pada jarak penuh tanpa mengubah klamp motor", () => {
    const door = { x: 60, y: 1, z: 29 };
    const desired = { x: 60, y: 3, z: 21 };
    const obstacles = cameraObstacles();
    const { x, z, w, h, d } = destinationHouses()[0];
    expect(x).toBe(door.x);
    const house = obstacles.findIndex((b) => b.minX === x - w / 2 && b.minZ === z - d / 2);
    expect(house).toBeGreaterThanOrEqual(0);
    expect(obstacles[house]).toEqual({
      minX: x - w / 2,
      maxX: x + w / 2,
      minY: 0,
      maxY: h,
      minZ: z - d / 2,
      maxZ: z + d / 2,
    });
    expect(occluders(door, desired, obstacles)).toEqual([house]);
    expect(clampCamera(door, desired, obstacles).z).toBeGreaterThan(z + d / 2);
  });
});

describe("containing — kamera di dalam bangunan", () => {
  const b = { minX: 0, minY: 0, minZ: 0, maxX: 4, maxY: 3, maxZ: 4 };
  it("memulangkan kotak yang mengandungi titik sahaja", () => {
    expect(containing({ x: 2, y: 1, z: 2 }, [b, { ...b, minX: 10, maxX: 12 }])).toEqual([0]);
    expect(containing({ x: 2, y: 5, z: 2 }, [b])).toEqual([]);
  });
});
