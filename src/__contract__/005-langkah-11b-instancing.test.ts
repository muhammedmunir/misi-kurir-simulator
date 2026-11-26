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
import roadsSrc from "@/components/3d/CityRoads.tsx?raw";
import { buildingLayout, doorPosition, windowPositions } from "@/components/3d/city-layout";
import { ROAD_LINES, roadTiles, streetLamps } from "@/components/3d/road-tiles";
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

// Pelan 012b: jalan rata lama (14 satah + garisan + lampu kotak) diganti dengan jubin
// jalan Kenney (CC0): jubin simpang empat di setiap persilangan dan jubin lurus di antaranya.
describe("jubin jalan, simpang dan lampu jalan", () => {
  it("49 jubin simpang 12×12 di setiap persilangan grid 40 m", () => {
    const cross = roadTiles().filter((t) => t.kind === "cross");
    expect(cross).toHaveLength(49);
    for (const x of ROAD_LINES)
      for (const z of ROAD_LINES) expect(cross).toContainEqual(expect.objectContaining({ x, z, w: 12, len: 12 }));
  });

  it("jubin lurus menutup setiap jalan dari −200 hingga 200 tanpa jurang atau tindihan", () => {
    const straight = roadTiles().filter((t) => t.kind === "straight" && t.axis === "z" && t.x === 0);
    const covered = straight.reduce((sum, t) => sum + t.len, 0) + ROAD_LINES.length * 12;
    expect(covered).toBeCloseTo(400);
    for (const t of straight) expect(t.len).toBeGreaterThan(8);
  });

  it("lampu jalan di kaki lima (dalam jalan, ≤ 0.6 m dari tepi) dan tidak di tengah blok (kotak parkir)", () => {
    for (const l of streetLamps()) {
      const off = Math.min(...ROAD_LINES.map((c) => Math.min(Math.abs(l.x - c), Math.abs(l.z - c))));
      expect(off).toBeCloseTo(5.4);
      const along = Math.abs(l.x - Math.round(l.x / 40) * 40) < 6 ? l.z : l.x;
      expect(Math.abs(((along - 20) % 40) + 0)).not.toBe(0);
    }
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

  it("CityRoads.tsx: 3 instancedMesh (jubin lurus, simpang, lampu), guna road-tiles", () => {
    expect(roadsSrc.match(/<instancedMesh\b/g) ?? []).toHaveLength(3);
    expect(roadsSrc).toMatch(/from "\.\/road-tiles"/);
    expect(roadsSrc).not.toMatch(/Array\.from/);
    expect(roadsSrc).toMatch(/computeBoundingSphere\(\)/);
  });
});
