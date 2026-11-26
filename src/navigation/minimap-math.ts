/**
 * Unjuran minimap "arah hadapan ke atas" — data tulen.
 * Hadapan = (sin h, cos h); kanan skrin = (−cos h, sin h).
 * Hasil dalam meter relatif kepada pemain: x ke kanan, y ke bawah (koordinat kanvas).
 */
export function toMinimap(
  world: { x: number; z: number },
  player: { x: number; z: number },
  heading: number,
): { x: number; y: number } {
  const dx = world.x - player.x;
  const dz = world.z - player.z;
  const right = -dx * Math.cos(heading) + dz * Math.sin(heading);
  const forward = dx * Math.sin(heading) + dz * Math.cos(heading);
  return { x: right, y: -forward };
}

/** Jejari dunia (m) yang dipaparkan dari pusat minimap ke tepi. */
export const MINIMAP_RANGE = 90;

/** Hadkan titik ke dalam bulatan jejari r (sasaran jauh dipaparkan di tepi). */
export function clampToRadius(p: { x: number; y: number }, r: number): { x: number; y: number; clamped: boolean } {
  const d = Math.hypot(p.x, p.y);
  if (d <= r) return { ...p, clamped: false };
  return { x: (p.x / d) * r, y: (p.y / d) * r, clamped: true };
}
