/// <reference types="vite/client" />
/**
 * Kontrak Pelan 014 — trafik pintar: berhenti di simpang, tidak merempuh
 * kereta di hadapan, berhenti bila pemain di hadapan dalam lorong.
 * Ditulis oleh perancang. C9 TIDAK boleh menyunting fail ini.
 */
import npcSrc from "@/components/3d/NPCTraffic.tsx?raw";
import {
  FOLLOW_GAP,
  type NPCTrafficVehicle,
  STOP_LINE,
  STOP_SECONDS,
  generateNPCTraffic,
  updateNPCTraffic,
} from "@/lib/npc-traffic";
import { describe, expect, it } from "vitest";

const DT = 1 / 30;

/** Kereta di jalan utara-selatan x = 0, lorong kiri (+3), menuju +z. */
function car(z: number, speed = 6, id = "a"): NPCTrafficVehicle {
  return {
    id,
    position: { x: 3, z },
    heading: 0,
    speed,
    color: "#fff",
    roadAxis: "z",
    roadValue: 0,
    direction: 1,
  };
}

function run(vs: NPCTrafficVehicle[], seconds: number, player?: { x: number; z: number }) {
  let cur = vs;
  for (let t = 0; t < seconds; t += DT) cur = updateNPCTraffic(cur, DT, player ? { player } : undefined);
  return cur;
}

describe("pemalar", () => {
  it("garis berhenti di luar jalan melintang (lebar 12) dan masa berhenti munasabah", () => {
    expect(STOP_LINE).toBeGreaterThanOrEqual(7);
    expect(STOP_LINE).toBeLessThanOrEqual(10);
    expect(STOP_SECONDS).toBeGreaterThanOrEqual(1);
    expect(STOP_SECONDS).toBeLessThanOrEqual(3);
    expect(FOLLOW_GAP).toBeGreaterThanOrEqual(4);
  });
});

describe("simpang", () => {
  it("berhenti di garis berhenti sebelum simpang (z = 40), menunggu, kemudian meneruskan", () => {
    const start = [car(40 - STOP_LINE - 3)];
    const stopped = run(start, 1.2);
    expect(stopped[0].position.z).toBeLessThanOrEqual(40 - STOP_LINE + 0.01);
    expect(stopped[0].position.z).toBeGreaterThan(40 - STOP_LINE - 0.5);

    // Masih menunggu separuh masa berhenti.
    const waiting = run(stopped, STOP_SECONDS / 2);
    expect(waiting[0].position.z).toBeLessThanOrEqual(40 - STOP_LINE + 0.01);

    // Selepas menunggu, melintas simpang dan tidak berhenti lagi di simpang yang sama.
    const gone = run(waiting, STOP_SECONDS + 4);
    expect(gone[0].position.z).toBeGreaterThan(40 + 6);
  });

  it("arah −z juga berhenti (garis berhenti di sisi lain simpang)", () => {
    const v = { ...car(0), position: { x: -3, z: 40 + STOP_LINE + 3 }, heading: Math.PI, direction: -1 as const };
    const stopped = run([v], 1.2);
    expect(stopped[0].position.z).toBeGreaterThanOrEqual(40 + STOP_LINE - 0.01);
  });
});

describe("kereta di hadapan", () => {
  it("kereta laju di belakang kereta perlahan tidak merempuh (jarak ≥ FOLLOW_GAP)", () => {
    // Jauh dari simpang: antara z = 50 dan z = 70 (simpang di 40 dan 80).
    const vs = [car(50, 9, "laju"), car(50 + FOLLOW_GAP + 4, 1.5, "perlahan")];
    let cur = vs;
    let minGap = Number.POSITIVE_INFINITY;
    for (let t = 0; t < 4; t += DT) {
      cur = updateNPCTraffic(cur, DT);
      minGap = Math.min(minGap, cur[1].position.z - cur[0].position.z);
    }
    expect(minGap).toBeGreaterThanOrEqual(FOLLOW_GAP - 0.01);
  });

  it("kereta di lorong lain tidak menghalang", () => {
    const other = { ...car(55, 0, "b"), position: { x: -3, z: 55 }, heading: Math.PI, direction: -1 as const };
    const out = run([car(48, 6), other], 1);
    expect(out[0].position.z).toBeGreaterThan(48 + 4);
  });
});

describe("pemain", () => {
  it("pemain di hadapan dalam lorong → kereta berhenti sebelum pemain", () => {
    const out = run([car(50, 6)], 3, { x: 3, z: 58 });
    expect(out[0].position.z).toBeLessThan(58 - 2);
    expect(out[0].speed).toBe(0);
  });

  it("pemain di lorong lain atau di belakang → kereta terus bergerak", () => {
    expect(run([car(50, 6)], 1, { x: -3, z: 54 })[0].position.z).toBeGreaterThan(54);
    expect(run([car(50, 6)], 1, { x: 3, z: 45 })[0].position.z).toBeGreaterThan(54);
  });

  it("selepas pemain beredar, kereta meneruskan perjalanan", () => {
    const blocked = run([car(50, 6)], 2, { x: 3, z: 58 });
    const free = run(blocked, 2);
    expect(free[0].position.z).toBeGreaterThan(58);
  });
});

describe("perubahan laju beransur", () => {
  it("tiada lompatan laju lebih daripada 10 m/s² dalam satu langkah", () => {
    let cur = [car(50, 6)];
    let prev = cur[0].speed;
    for (let t = 0; t < 3; t += DT) {
      cur = updateNPCTraffic(cur, DT, { player: { x: 3, z: 58 } });
      expect(Math.abs(cur[0].speed - prev)).toBeLessThanOrEqual(10 * DT + 1e-9);
      prev = cur[0].speed;
    }
  });
});

describe("serasi dengan kod sedia ada", () => {
  it("generateNPCTraffic + langkah besar kekal dalam −200…200", () => {
    let seed = 3;
    const rng = () => {
      seed = (seed * 16807) % 2147483647;
      return (seed - 1) / 2147483646;
    };
    const out = updateNPCTraffic(generateNPCTraffic(20, rng), 50);
    for (const v of out) {
      expect(Math.abs(v.position.x)).toBeLessThanOrEqual(200);
      expect(Math.abs(v.position.z)).toBeLessThanOrEqual(200);
    }
  });

  it("NPCTraffic.tsx menghantar kedudukan pemain kepada updateNPCTraffic", () => {
    expect(npcSrc).toMatch(/updateNPCTraffic\([\s\S]*?player:\s*playerState\.getPosition\(\)/);
  });
});
