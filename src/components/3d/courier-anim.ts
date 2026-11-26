/**
 * Pemilihan klip animasi kurier — data tulen.
 * Klip daripada Kenney Mini Characters (lihat CharacterGLB.tsx).
 */
import type { Clip } from "./CharacterGLB";

/** Laju (m/s) di mana kurier mula berlari pecut. */
export const SPRINT_FROM = 6.5;
/** Laju di mana klip berjalan dimainkan pada kelajuan asal. */
const WALK_REF = 3.2;
const SPRINT_REF = 8;

export function courierClip(state: { riding: boolean; speed: number; carrying: boolean }): {
  clip: Clip;
  timeScale: number;
} {
  if (state.riding) return { clip: "drive", timeScale: 1 };
  const s = Math.max(0, state.speed);
  if (state.carrying) {
    // Memegang kotak dengan dua tangan; kaki melangkah ikut laju.
    return { clip: "holding-both", timeScale: s > 0.3 ? Math.min(1.6, 0.6 + s / WALK_REF / 2) : 1 };
  }
  if (s > SPRINT_FROM) return { clip: "sprint", timeScale: Math.min(1.5, s / SPRINT_REF) };
  if (s > 0.3) return { clip: "walk", timeScale: Math.min(1.6, Math.max(0.6, s / WALK_REF)) };
  return { clip: "idle", timeScale: 1 };
}
