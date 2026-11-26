/**
 * Postur rig kurier — data tulen, tiada React/three. Sudut dalam radian,
 * putaran pada paksi x setempat (positif = hujung anggota ke belakang).
 * Anggota menunjuk ke bawah (−y) pada sudut 0; −π/2 = menunjuk ke hadapan (+z).
 */

export type CourierPose = {
  hipL: number;
  hipR: number;
  kneeL: number;
  kneeR: number;
  shoulderL: number;
  shoulderR: number;
  elbowL: number;
  elbowR: number;
  /** Turun naik badan semasa melangkah (m). */
  bob: number;
};

export type PoseInput = {
  mode: "foot" | "ride";
  /** Fasa langkah (rad), bertambah ikut jarak berjalan. */
  phase: number;
  /** Laju berjalan kaki 0…1 (0 = diam, 1 = berlari penuh). */
  gait: number;
};

/** Panjang satu langkah penuh (dua tapak) dalam meter, untuk memajukan fasa. */
export const STRIDE = 1.5;

/** Fasa bertambah 2π setiap STRIDE meter. */
export function advancePhase(phase: number, distance: number): number {
  return (phase + (distance / STRIDE) * Math.PI * 2) % (Math.PI * 200);
}

export function courierPose({ mode, phase, gait }: PoseInput): CourierPose {
  if (mode === "ride") {
    // Duduk: paha ke hadapan, betis ke bawah, tangan memegang hendal.
    return {
      hipL: -1.45,
      hipR: -1.45,
      kneeL: 1.35,
      kneeR: 1.35,
      shoulderL: -1.05,
      shoulderR: -1.05,
      elbowL: -0.35,
      elbowR: -0.35,
      bob: 0,
    };
  }
  const g = Math.max(0, Math.min(1, gait));
  if (g < 0.02) {
    // Diam: tangan rapat, siku sedikit bengkok.
    return { hipL: 0, hipR: 0, kneeL: 0, kneeR: 0, shoulderL: 0, shoulderR: 0, elbowL: -0.15, elbowR: -0.15, bob: 0 };
  }
  const s = Math.sin(phase);
  const swing = 0.35 + 0.4 * g; // berjalan 0.35 → berlari 0.75
  const knee = 0.4 + 0.9 * g;
  return {
    hipL: -s * swing,
    hipR: s * swing,
    // Lutut bengkok semasa kaki diayun ke hadapan (fasa kaki itu bergerak ke depan).
    kneeL: Math.max(0, Math.cos(phase)) * knee,
    kneeR: Math.max(0, -Math.cos(phase)) * knee,
    // Tangan berayun bertentangan dengan kaki.
    shoulderL: s * swing * 0.9,
    shoulderR: -s * swing * 0.9,
    elbowL: -0.25 - 0.6 * g,
    elbowR: -0.25 - 0.6 * g,
    bob: Math.abs(Math.cos(phase)) * 0.04 * (0.5 + g),
  };
}
