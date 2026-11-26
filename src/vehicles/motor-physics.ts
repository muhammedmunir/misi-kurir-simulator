/**
 * Fizik motor kapcai — data tulen, tiada React/three. Unit: meter, saat, radian.
 * Hadapan = (sin heading, cos heading); kanan skrin = heading berkurang.
 */

export const MOTOR_PHYS = {
  /** Laju maksimum ke hadapan (m/s). 25 m/s = 90 km/j. */
  maxSpeed: 25,
  /** Laju maksimum undur (m/s). */
  maxReverse: 4,
  /** Pecutan pada laju 0 (m/s²); berkurang secara kuadratik ke 0 pada laju maksimum. */
  accel: 11,
  /** Brek kaki (S semasa bergerak ke hadapan), m/s². */
  brake: 22,
  /** Brek tangan (butang BREK), m/s². */
  handBrake: 30,
  /** Pecutan undur, m/s². */
  reverseAccel: 3,
  /** Geseran luncur: tetap + bergantung laju (m/s²). */
  rollDrag: 1.2,
  airDrag: 0.012,
  /** Kadar belok maksimum (rad/s) pada laju sederhana. */
  turnRate: 1.9,
  /** Laju (m/s) untuk kadar belok penuh; di bawahnya belok lebih perlahan. */
  turnFullAt: 5,
  /** Bahagian kadar belok yang hilang pada laju maksimum (stabil di laju tinggi). */
  turnHighSpeedLoss: 0.5,
  /** Kadar stereng papan kekunci mencapai sasaran (1/s). */
  steerResponse: 7,
  /** Condongan maksimum (rad) dan kelajuannya mengikut (1/s). */
  maxLean: 0.42,
  leanResponse: 6,
} as const;

export type MotorPhysState = { speed: number; heading: number; steer: number; lean: number };
export type MotorInput = {
  /** −1 … 1: W = 1 (pecut), S = −1 (brek, kemudian undur). */
  throttle: number;
  /** −1 … 1: D/kanan = 1. */
  steer: number;
  /** Butang BREK. */
  handBrake: boolean;
};

const approach = (cur: number, target: number, rate: number, dt: number) =>
  cur + (target - cur) * (1 - Math.exp(-rate * dt));

/** Satu langkah fizik. Tidak mengubah `s`; memulangkan keadaan baharu. */
export function stepMotor(s: MotorPhysState, input: MotorInput, dt: number): MotorPhysState {
  const P = MOTOR_PHYS;
  let speed = s.speed;

  // ── Laju ──
  if (input.handBrake) {
    speed = towardZero(speed, P.handBrake * dt);
  } else if (input.throttle > 0.15) {
    if (speed < 0) speed = towardZero(speed, P.brake * dt);
    else speed += P.accel * input.throttle * (1 - (speed / P.maxSpeed) ** 2) * dt;
  } else if (input.throttle < -0.15) {
    if (speed > 0.3) speed = towardZero(speed, P.brake * -input.throttle * dt);
    else speed -= P.reverseAccel * -input.throttle * dt;
  } else {
    speed = towardZero(speed, (P.rollDrag + P.airDrag * speed * speed) * dt);
  }
  speed = Math.max(-P.maxReverse, Math.min(P.maxSpeed, speed));

  // ── Stereng: ditapis supaya papan kekunci (0/1) terasa seperti memusing hendal ──
  const steer = approach(s.steer, Math.max(-1, Math.min(1, input.steer)), P.steerResponse, dt);

  // ── Belok: perlahan pada laju rendah, stabil pada laju tinggi; undur membalikkan arah ──
  const abs = Math.abs(speed);
  const turn = P.turnRate * Math.min(abs / P.turnFullAt, 1) * (1 - P.turnHighSpeedLoss * Math.min(abs / P.maxSpeed, 1));
  const heading = s.heading - steer * Math.sign(speed) * turn * dt;

  // ── Condong ke arah belokan, lebih banyak bila laju ──
  const leanTarget = speed > 0.5 ? steer * P.maxLean * Math.min(abs / (P.maxSpeed * 0.6), 1) : 0;
  const lean = approach(s.lean, leanTarget, P.leanResponse, dt);

  return { speed, heading, steer, lean };
}

function towardZero(v: number, amount: number): number {
  if (v > 0) return Math.max(0, v - amount);
  if (v < 0) return Math.min(0, v + amount);
  return 0;
}

/** Laju untuk paparan HUD (km/j). */
export function speedKmh(speed: number): number {
  return Math.round(Math.abs(speed) * 3.6);
}

/** FOV kamera mengikut laju: 60° diam, sehingga 72° pada laju maksimum. */
export function speedFov(speed: number): number {
  return 60 + 12 * Math.min(Math.abs(speed) / MOTOR_PHYS.maxSpeed, 1);
}
