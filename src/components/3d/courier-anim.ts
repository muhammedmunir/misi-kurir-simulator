/**
 * Pemilihan klip animasi kurier — data tulen.
 * Klip Mixamo (lihat CharacterGLB.tsx).
 */
import type { Clip } from "./CharacterGLB";

/** Laju (m/s) di mana kurier mula berlari. */
export const SPRINT_FROM = 6.5;
/** Laju di mana klip berjalan/berlari dimainkan pada kelajuan asal. */
const WALK_REF = 1.6;
const RUN_REF = 5.5;

export function courierClip(state: { riding: boolean; speed: number; carrying: boolean }): {
  clip: Clip;
  timeScale: number;
} {
  if (state.riding) return { clip: "drive", timeScale: 1 };
  const s = Math.max(0, state.speed);
  if (state.carrying) {
    // Memegang kotak dengan dua tangan; kaki melangkah ikut laju.
    if (s > 0.3) return { clip: "carryWalk", timeScale: Math.min(1.6, Math.max(0.6, s / WALK_REF / 2)) };
    return { clip: "carry", timeScale: 1 };
  }
  if (s > SPRINT_FROM) return { clip: "run", timeScale: Math.min(1.5, Math.max(0.7, s / RUN_REF)) };
  if (s > 0.3) return { clip: "walk", timeScale: Math.min(1.6, Math.max(0.6, s / WALK_REF / 2)) };
  return { clip: "idle", timeScale: 1 };
}
