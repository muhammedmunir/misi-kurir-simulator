/// <reference types="vite/client" />
/**
 * Kontrak Pelan 005 Langkah 11b — instancing bangunan & jalan (prestasi telefon).
 * Ditulis oleh perancang. C9 TIDAK boleh menyunting fail ini.
 *
 * Adegan sebenar (11a, desktop): 583 mesh, 265–274 draw call. Buildings = 349 mesh
 * (23 badan + 23 pintu + 303 tingkap), Roads = 78 mesh (14 jalan + 40 garisan + 12 tiang + 12 lampu).
 *
 * Susun atur bandar MESTI kekal sama: nilai rujukan di bawah dikira daripada algoritma
 * `Buildings.tsx` sebelum langkah ini (seed 42). Hanya cara melukis berubah.
 */
import buildingsSrc from "@/components/3d/Buildings.tsx?raw";
import roadsSrc from "@/components/3d/Roads.tsx?raw";
import {
  buildingLayout,
  doorPosition,
  roadLayout,
  roadMarkingPositions,
  streetLightPositions,
  windowPositions,
} from "@/components/3d/city-layout";
import { describe, expect, it } from "vitest";

type V3 = [number, number, number];

function expectV3(actual: V3, expected: V3) {
  expect(actual).toHaveLength(3);
  for (let i = 0; i < 3; i++) expect(actual[i]).toBeCloseTo(expected[i], 9);
}

describe("buildingLayout() — susun atur sama seperti sebelum 11b", () => {
  const bs = buildingLayout();
  const sum = (k: "x" | "z" | "width" | "height" | "depth") => bs.reduce((a, b) => a + b[k], 0);

  it("23 bangunan; jumlah kedudukan & saiz sama", () => {
    expect(bs).toHaveLength(23);
    expect(sum("x")).toBeCloseTo(499.8389093688119, 9);
    expect(sum("z")).toBeCloseTo(700.5501228762326, 9);
    expect(sum("width")).toBeCloseTo(225.8310730530238, 9);
    expect(sum("height")).toBeCloseTo(383.0998724681324, 9);
    expect(sum("depth")).toBeCloseTo(218.8455547772773, 9);
  });

  it("bangunan pertama & terakhir sama tepat; warna ikut turutan", () => {
    const first = bs[0];
    expect(first.x).toBeCloseTo(-99.9016515928336, 9);
    expect(first.y).toBeCloseTo(4.4628582540553605, 9);
    expect(first.z).toBeCloseTo(-99.05830587172723, 9);
    expect(first.width).toBeCloseTo(8.10644432353456, 9);
    expect(first.height).toBeCloseTo(8.925716508110721, 9);
    expect(first.depth).toBeCloseTo(9.009791768165112, 9);
    expect(first.floors).toBe(2);
    const last = bs[bs.length - 1];
    expect(last.x).toBeCloseTo(139.71398372176475, 9);
    expect(last.z).toBeCloseTo(140.92442959074344, 9);
    expect(last.floors).toBe(4);
    expect(bs.map((b) => b.color).join(",")).toBe(
      "#4b5c6d,#4a5568,#7a8a9a,#4a5568,#4a5568,#3d4f5f,#4b5c6d,#7a8a9a,#4b5c6d,#4a5568,#4b5c6d,#5a6578,#6a7588,#4b5c6d,#3d4f5f,#7a8a9a,#6a7588,#3d4f5f,#3d4f5f,#6a7588,#7a8a9a,#7a8a9a,#7a8a9a",
    );
  });

  it("deterministik: dua panggilan memberi hasil sama", () => {
    expect(buildingLayout()).toEqual(bs);
  });
});

describe("tingkap & pintu dalam koordinat dunia", () => {
  const bs = buildingLayout();

  it("jumlah tingkap 303 (min(floors, 5) × 3 setiap bangunan)", () => {
    expect(bs.reduce((a, b) => a + windowPositions(b).length, 0)).toBe(303);
    for (const b of bs) expect(windowPositions(b)).toHaveLength(Math.min(b.floors, 5) * 3);
  });

  it("kedudukan tingkap = kedudukan kumpulan bangunan + ofset lama; turutan tingkat→lajur", () => {
    const b = bs[0];
    const w = windowPositions(b);
    const zFront = b.z + b.depth / 2 + 0.05;
    expectV3(w[0], [b.x - b.width / 3, b.y - b.height / 2 + 2, zFront]);
    expectV3(w[1], [b.x - b.width / 3 + b.width / 4, b.y - b.height / 2 + 2, zFront]);
    expectV3(w[3], [b.x - b.width / 3, b.y - b.height / 2 + 5, zFront]);
  });

  it("pintu di tengah muka hadapan", () => {
    const b = bs[5];
    expectV3(doorPosition(b), [b.x, b.y - b.height / 2 + 1.5, b.z + b.depth / 2 + 0.05]);
  });
});

describe("jalan, garisan dan lampu jalan", () => {
  it("14 jalan grid: mendatar (w 400 × d 12) dan menegak (w 12 × d 400) setiap 40 unit", () => {
    const roads = roadLayout();
    expect(roads).toHaveLength(14);
    for (let i = -3; i <= 3; i++) {
      expect(roads).toContainEqual({ x: 0, z: i * 40, rotY: 0, w: 400, d: 12 });
      expect(roads).toContainEqual({ x: i * 40, z: 0, rotY: Math.PI / 2, w: 12, d: 400 });
    }
  });

  it("40 garisan jalan di x 0, y 0.08, z (i − 20) × 10", () => {
    const m = roadMarkingPositions();
    expect(m).toHaveLength(40);
    for (let i = 0; i < 40; i++) expectV3(m[i], [0, 0.08, (i - 20) * 10]);
  });

  it("12 lampu jalan di x 8, z (i − 6) × 30", () => {
    const l = streetLightPositions();
    expect(l).toHaveLength(12);
    for (let i = 0; i < 12; i++) expect(l[i]).toEqual({ x: 8, z: (i - 6) * 30 });
  });
});

describe("komponen melukis dengan instancedMesh", () => {
  it("Buildings.tsx: 3 instancedMesh (badan, tingkap, pintu), guna city-layout, tiada mesh setiap tingkap", () => {
    expect(buildingsSrc.match(/<instancedMesh\b/g) ?? []).toHaveLength(3);
    expect(buildingsSrc).toMatch(/from "\.\/city-layout"/);
    expect(buildingsSrc).not.toMatch(/Array\.from/);
    expect(buildingsSrc).not.toMatch(/pseudoRandom/);
    expect(buildingsSrc).toMatch(/setColorAt/);
    expect(buildingsSrc).toMatch(/computeBoundingSphere\(\)/);
  });

  it("Roads.tsx: 4 instancedMesh (jalan, garisan, tiang, lampu), guna city-layout", () => {
    expect(roadsSrc.match(/<instancedMesh\b/g) ?? []).toHaveLength(4);
    expect(roadsSrc).toMatch(/from "\.\/city-layout"/);
    expect(roadsSrc).not.toMatch(/Array\.from/);
    expect(roadsSrc).toMatch(/computeBoundingSphere\(\)/);
  });
});
