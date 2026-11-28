import { describe, expect, it } from "vitest";
import { streetProps } from "./city-blocks";
import { CABLE_ANCHORS, CABLE_SAG, powerLineSegments } from "./power-lines";

const poles = streetProps().filter((p) => p.model.endsWith("/electricity-pole"));

describe("powerLineSegments", () => {
  const pos = powerLineSegments(poles);
  const points = Array.from({ length: pos.length / 3 }, (_, i) => [pos[i * 3], pos[i * 3 + 1], pos[i * 3 + 2]]);

  it("tiada lagi model wayar Kenney yang diregang", () => {
    expect(streetProps().some((p) => p.model.endsWith("/electricity-wires"))).toBe(false);
  });

  it("kabel menyambung tiang berjiran sahaja dan tidak merentas lajur", () => {
    expect(points.length).toBeGreaterThan(0);
    expect(points.length % 2).toBe(0);
    const xs = new Set(poles.map((p) => p.x));
    for (let i = 0; i < points.length; i += 2) {
      const [ax, , az] = points[i];
      const [bx, , bz] = points[i + 1];
      expect(ax).toBe(bx);
      expect(bz).toBeGreaterThan(az);
      expect([...xs].some((x) => CABLE_ANCHORS.some((a) => Math.abs(x + a.dx - ax) < 1e-4))).toBe(true);
    }
  });

  it("melendut: titik tengah lebih rendah daripada hujung, tidak pernah mencecah kepala orang", () => {
    const lowest = Math.min(...points.map((p) => p[1]));
    const top = Math.min(...CABLE_ANCHORS.map((a) => a.y));
    expect(lowest).toBeCloseTo(top - CABLE_SAG, 3);
    expect(lowest).toBeGreaterThan(4.5);
  });
});
