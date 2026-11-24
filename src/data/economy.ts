// Central economy config (master prompt section M). All amounts in whole RM.
// Starting values only; to be rebalanced in the economy plan.

export const STARTING_MONEY = 500;

/** Per-parcel pay, inclusive range. Whole ringgit avoids float drift in money sums. */
export const DELIVERY_REWARD_MIN = 3;
export const DELIVERY_REWARD_MAX = 8;

export const VEHICLE_PRICES = {
  matic: 0,
  bebek: 0,
  kargo: 4500,
  van: 80000,
  pickup: 100000,
} as const;

/** rng() in [0, 1) → whole RM in [DELIVERY_REWARD_MIN, DELIVERY_REWARD_MAX]. */
export function rollDeliveryReward(rng: () => number): number {
  const span = DELIVERY_REWARD_MAX - DELIVERY_REWARD_MIN + 1;
  return DELIVERY_REWARD_MIN + Math.floor(rng() * span);
}
