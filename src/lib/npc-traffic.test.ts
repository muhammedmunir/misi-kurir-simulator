import { describe, expect, it } from "vitest";
import { generateNPCTraffic, updateNPCTraffic } from "./npc-traffic";

// ── NPC Traffic ──────────────────────────────────────────────────

describe("generateNPCTraffic", () => {
  it("jana bilangan yang diminta", () => {
    const v = generateNPCTraffic(8, () => 0.5);
    expect(v).toHaveLength(8);
  });

  it("jana 0", () => {
    const v = generateNPCTraffic(0, () => 0.5);
    expect(v).toHaveLength(0);
  });

  it("id unik setiap kenderaan", () => {
    const v = generateNPCTraffic(5, () => 0.5);
    const ids = v.map((n) => n.id);
    const unique = new Set(ids);
    expect(unique.size).toBe(5);
  });

  it("roadAxis atau x atau z", () => {
    const v = generateNPCTraffic(10, () => 0.5);
    for (const n of v) {
      expect(n.roadAxis).oneOf(["x", "z"]);
    }
  });

  it("heading betul mengikut paksi", () => {
    const v = generateNPCTraffic(20, () => 0.5);
    for (const n of v) {
      if (n.roadAxis === "z") {
        expect(n.heading).oneOf([0, Math.PI]);
      } else {
        expect(n.heading).oneOf([Math.PI / 2, -Math.PI / 2]);
      }
    }
  });
});

describe("updateNPCTraffic", () => {
  it("balut sempadan +200 / -200 paksi-z", () => {
    const v = generateNPCTraffic(1, () => 0.5);
    const result = updateNPCTraffic(v, 50);
    expect(result[0].position.z).toBeGreaterThanOrEqual(-200);
    expect(result[0].position.z).toBeLessThanOrEqual(200);
  });

  it("balut sempadan +200 / -200 paksi-x", () => {
    const v = generateNPCTraffic(1, () => 0.26);
    const result = updateNPCTraffic(v, 50);
    expect(result[0].position.x).toBeGreaterThanOrEqual(-200);
    expect(result[0].position.x).toBeLessThanOrEqual(200);
  });

  it("tidak ubah property lain", () => {
    const v = generateNPCTraffic(1, () => 0.5);
    const original = v[0];
    const result = updateNPCTraffic(v, 0.016);
    expect(result[0].speed).toBe(original.speed);
    expect(result[0].color).toBe(original.color);
    expect(result[0].roadAxis).toBe(original.roadAxis);
    expect(result[0].roadValue).toBe(original.roadValue);
  });

  it("delta 0 tidak ubah posisi", () => {
    const v = generateNPCTraffic(3, () => 0.5);
    const positions = v.map((n) => ({ ...n.position }));
    const result = updateNPCTraffic(v, 0);
    for (let i = 0; i < result.length; i++) {
      expect(result[i].position.x).toBe(positions[i].x);
      expect(result[i].position.z).toBe(positions[i].z);
    }
  });
});
