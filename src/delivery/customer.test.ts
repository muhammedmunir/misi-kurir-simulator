import { rollCustomer } from "@/delivery/customer";
import { INDUSTRI, SHOP } from "@/test/delivery-fixtures";
import { describe, expect, it } from "vitest";

describe("rollCustomer", () => {
  it("menepati taburan dalam tiga mata peratusan bagi 1000 gulungan", () => {
    const counts = { home: 0, absent: 0, neighbour: 0, refuse: 0 };
    let seed = 73;
    for (let i = 0; i < 1000; i++) {
      counts[
        rollCustomer(() => {
          seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
          return seed / 2 ** 32;
        }, SHOP)
      ]++;
    }
    for (const mood of ["home", "absent", "neighbour", "refuse"] as const) {
      const expected = { home: 750, absent: 100, neighbour: 80, refuse: 70 };
      expect(Math.abs(counts[mood] - expected[mood])).toBeLessThanOrEqual(30);
    }
  });

  it("mengutamakan ketiadaan penerima di zon industri", () => {
    expect(rollCustomer(() => 0, INDUSTRI)).toBe("absent");
    expect(rollCustomer(() => 0.99, INDUSTRI)).toBe("absent");
  });
});
