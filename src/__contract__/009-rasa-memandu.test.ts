/// <reference types="vite/client" />
/**
 * Kontrak Pelan 009 — rasa memandu: pecutan beransur, brek, belok bergantung
 * laju, condong, FOV laju, bunyi enjin, trafik di lorong kiri dan collision trafik.
 */
import { engineGain, enginePitch } from "@/audio/engine-sound";
import roadsSrc from "@/components/3d/CityRoads.tsx?raw";
import worldSrc from "@/components/3d/WorldEnvironment.tsx?raw";
import { CAR_MODELS, carModelFor, trafficCarSize } from "@/components/3d/car-models";
import { fitMatrix } from "@/components/3d/merged-model";
import { roadTiles } from "@/components/3d/road-tiles";
import { LANE_OFFSET, generateNPCTraffic, liveTrafficRects, setLiveTraffic } from "@/lib/npc-traffic";
import { MOTOR_PHYS, type MotorPhysState, speedFov, speedKmh, stepMotor } from "@/vehicles/motor-physics";
import { Box3, Vector3 } from "three";
import { describe, expect, it } from "vitest";

const DT = 1 / 60;
const rest: MotorPhysState = { speed: 0, heading: 0, steer: 0, lean: 0 };

function run(s: MotorPhysState, input: Parameters<typeof stepMotor>[1], seconds: number): MotorPhysState {
  let cur = s;
  for (let t = 0; t < seconds; t += DT) cur = stepMotor(cur, input, DT);
  return cur;
}

const W = { throttle: 1, steer: 0, handBrake: false };

describe("pecutan dan laju", () => {
  it("pecutan beransur: 0→50 km/j lebih pantas daripada 50→80 km/j", () => {
    let s = rest;
    let t50 = 0;
    let t80 = 0;
    for (let t = 0; t < 20; t += DT) {
      s = stepMotor(s, W, DT);
      if (!t50 && speedKmh(s.speed) >= 50) t50 = t;
      if (!t80 && speedKmh(s.speed) >= 80) {
        t80 = t;
        break;
      }
    }
    expect(t50).toBeGreaterThan(0.8);
    expect(t50).toBeLessThan(2.5);
    expect(t80 - t50).toBeGreaterThan(t50);
  });

  it("tidak melebihi laju maksimum (90 km/j)", () => {
    const s = run(rest, W, 30);
    expect(s.speed).toBeLessThanOrEqual(MOTOR_PHYS.maxSpeed);
    expect(speedKmh(s.speed)).toBeLessThanOrEqual(90);
  });

  it("melepaskan pendikit: luncur perlahan-lahan, bukan berhenti serta-merta", () => {
    const fast = { ...rest, speed: 20 };
    const after1s = run(fast, { throttle: 0, steer: 0, handBrake: false }, 1);
    expect(after1s.speed).toBeGreaterThan(14);
    expect(after1s.speed).toBeLessThan(20);
  });

  it("S semasa bergerak = brek (berhenti dari 72 km/j < 1.2 s), kemudian undur perlahan", () => {
    const braked = run({ ...rest, speed: 20 }, { throttle: -1, steer: 0, handBrake: false }, 1.2);
    expect(braked.speed).toBeLessThanOrEqual(0);
    const rev = run(rest, { throttle: -1, steer: 0, handBrake: false }, 5);
    expect(rev.speed).toBeLessThan(0);
    expect(rev.speed).toBeGreaterThanOrEqual(-MOTOR_PHYS.maxReverse);
  });

  it("butang BREK memberhentikan motor", () => {
    const s = run({ ...rest, speed: 25 }, { throttle: 0, steer: 0, handBrake: true }, 1);
    expect(s.speed).toBe(0);
  });
});

describe("belok dan condong", () => {
  it("D (stereng +1) membelok ke kanan skrin: heading berkurang", () => {
    const s = run({ ...rest, speed: 10 }, { throttle: 0.5, steer: 1, handBrake: false }, 0.5);
    expect(s.heading).toBeLessThan(0);
  });

  it("tidak membelok semasa diam", () => {
    const s = run(rest, { throttle: 0, steer: 1, handBrake: false }, 1);
    expect(s.heading).toBe(0);
  });

  it("stereng papan kekunci ditapis: tidak melompat terus ke 1", () => {
    const s = stepMotor({ ...rest, speed: 10 }, { throttle: 0, steer: 1, handBrake: false }, DT);
    expect(s.steer).toBeGreaterThan(0);
    expect(s.steer).toBeLessThan(0.3);
  });

  it("condong ke arah belokan, lebih banyak pada laju tinggi, dan kembali tegak", () => {
    const slow = run({ ...rest, speed: 5 }, { throttle: 0.3, steer: 1, handBrake: false }, 1);
    const fast = run({ ...rest, speed: 20 }, { throttle: 1, steer: 1, handBrake: false }, 1);
    expect(fast.lean).toBeGreaterThan(slow.lean);
    expect(fast.lean).toBeGreaterThan(0.2);
    expect(fast.lean).toBeLessThanOrEqual(MOTOR_PHYS.maxLean);
    const upright = run(fast, { throttle: 1, steer: 0, handBrake: false }, 1.5);
    expect(Math.abs(upright.lean)).toBeLessThan(0.02);
  });
});

describe("kamera dan HUD", () => {
  it("km/j = m/s × 3.6; FOV 60° diam hingga 72° laju maksimum", () => {
    expect(speedKmh(25)).toBe(90);
    expect(speedKmh(-2)).toBe(7);
    expect(speedFov(0)).toBe(60);
    expect(speedFov(MOTOR_PHYS.maxSpeed)).toBe(72);
  });
});

describe("bunyi enjin", () => {
  it("pic dan kelantangan naik dengan laju; pendikit menambah", () => {
    expect(enginePitch(1, 0)).toBeGreaterThan(enginePitch(0, 0));
    expect(enginePitch(0.5, 1)).toBeGreaterThan(enginePitch(0.5, 0));
    expect(engineGain(1, 1)).toBeGreaterThan(engineGain(0, 0));
    expect(engineGain(1, 1)).toBeLessThanOrEqual(0.2);
  });
});

describe("trafik", () => {
  it("kenderaan memandu di lorong kiri (Malaysia), bukan di garis tengah", () => {
    let seed = 7;
    const rng = () => {
      seed = (seed * 16807) % 2147483647;
      return (seed - 1) / 2147483646;
    };
    for (const v of generateNPCTraffic(40, rng)) {
      // Pemandu menghadap (sin h, cos h); kiri pemandu = (cos h, −sin h).
      const left = { x: Math.cos(v.heading), z: -Math.sin(v.heading) };
      const off = v.roadAxis === "z" ? (v.position.x - v.roadValue) * left.x : (v.position.z - v.roadValue) * left.z;
      expect(off).toBeCloseTo(LANE_OFFSET);
    }
  });

  // Pelan 025 (dikemas kini oleh perancang): kotak = trafficCarSize(model kereta) dan bukan 1.6 × 3 tetap.
  // Model kenderaan ke-i dalam senarai live = CAR_MODELS[carModelFor(i)], sama seperti NPCTraffic.tsx.
  it("liveTrafficRects: kotak saiz model kereta (trafficCarSize) mengikut arah jalan", () => {
    const vs = generateNPCTraffic(CAR_MODELS.length * 2, () => 0.9);
    setLiveTraffic(vs);
    const rects = liveTrafficRects();
    expect(rects).toHaveLength(vs.length);
    vs.forEach((v, i) => {
      const model = CAR_MODELS[carModelFor(i)].replace(/^\/models\//, "").replace(/\.glb$/, "");
      const size = trafficCarSize(model);
      const r = rects[i];
      expect(r.maxX - r.minX, model).toBeCloseTo(v.roadAxis === "z" ? size.w : size.d);
      expect(r.maxZ - r.minZ, model).toBeCloseTo(v.roadAxis === "z" ? size.d : size.w);
      expect((r.minX + r.maxX) / 2).toBeCloseTo(v.position.x);
      expect((r.minZ + r.maxZ) / 2).toBeCloseTo(v.position.z);
    });
    setLiveTraffic([]);
    expect(liveTrafficRects()).toEqual([]);
  });
});

describe("B28 — dinding hitam gergasi (Terrain)", () => {
  it("Terrain (bucu XZ yang diputar −90° menjadi dinding tegak 400×400 di z≈0) dibuang; tanah rata kekal", () => {
    expect(worldSrc).not.toMatch(/Terrain/);
    expect(worldSrc).toMatch(/planeGeometry args=\{\[500, 500\]\}/);
  });
});

// Pelan 012b: jubin jalan Kenney diletakkan dengan fitMatrix (tiada putaran x),
// jadi tapaknya sentiasa rata pada y = 0. Ujian memakai kotak jubin unit.
describe("B29 — jalan utara-selatan berdiri tegak sebagai dinding", () => {
  it("setiap jubin rata (y 0…0.2) dan meliputi tapaknya pada satah XZ", () => {
    const unit = new Box3(new Vector3(-0.5, 0, -0.5), new Vector3(0.5, 0.02, 0.5));
    for (const t of roadTiles()) {
      const rot = t.axis === "z" ? Math.PI / 2 : 0;
      const m = fitMatrix(unit, { x: t.x, z: t.z, w: t.len, h: 0.12, d: t.w, rotY: rot });
      const corners = [
        [-0.5, 0, -0.5],
        [0.5, 0.02, -0.5],
        [-0.5, 0, 0.5],
        [0.5, 0.02, 0.5],
      ].map(([x, y, z]) => new Vector3(x, y, z).applyMatrix4(m));
      for (const c of corners) {
        expect(c.y).toBeGreaterThanOrEqual(-1e-9);
        expect(c.y).toBeLessThanOrEqual(0.2);
      }
      const xs = corners.map((c) => c.x);
      const zs = corners.map((c) => c.z);
      const [ex, ez] = t.axis === "z" ? [t.w, t.len] : [t.len, t.w];
      expect(Math.max(...xs) - Math.min(...xs)).toBeCloseTo(ex);
      expect(Math.max(...zs) - Math.min(...zs)).toBeCloseTo(ez);
    }
  });

  it("CityRoads memakai roadTiles dan fitMatrix", () => {
    expect(roadsSrc).toMatch(/roadTiles\(\)/);
    expect(roadsSrc).toMatch(/fitMatrix\(/);
  });
});
