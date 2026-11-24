import { describe, expect, it } from "vitest";
import { DELIVERY_REWARD_MAX, DELIVERY_REWARD_MIN, rollDeliveryReward } from "./economy";

describe("rollDeliveryReward", () => {
  it("rng 0 → minimum", () => {
    expect(rollDeliveryReward(() => 0)).toBe(DELIVERY_REWARD_MIN);
  });

  it("rng hampir 1 → maksimum, tidak melebihi", () => {
    expect(rollDeliveryReward(() => 0.999999)).toBe(DELIVERY_REWARD_MAX);
  });

  it("sentiasa ringgit bulat dalam julat", () => {
    for (let i = 0; i < 100; i++) {
      const r = rollDeliveryReward(() => i / 100);
      expect(Number.isInteger(r)).toBe(true);
      expect(r).toBeGreaterThanOrEqual(DELIVERY_REWARD_MIN);
      expect(r).toBeLessThanOrEqual(DELIVERY_REWARD_MAX);
    }
  });
});
