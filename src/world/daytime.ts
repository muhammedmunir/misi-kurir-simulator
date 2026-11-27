import type { GameSettings } from "@/types/game";

export const START_MINUTES = 8 * 60;
export const MINUTES_PER_DAY = 24 * 60;

function wrapMinutes(minutes: number): number {
  return ((minutes % MINUTES_PER_DAY) + MINUTES_PER_DAY) % MINUTES_PER_DAY;
}

export function advanceTime(minutes: number, seconds: number): number {
  return wrapMinutes(minutes + seconds);
}

// Mercu warna: malam, subuh, siang dan senja. Hujung jadual bertemu pada tengah malam.
const KEYFRAMES = [
  { at: 0, sun: 0, sky: 0x101e38, horizon: 0x34465e },
  { at: 300, sun: 0, sky: 0x101e38, horizon: 0x34465e },
  { at: 360, sun: 0.22, sky: 0x516a95, horizon: 0xedaf8a },
  { at: 480, sun: 0.8, sky: 0x4785c7, horizon: 0xcfe0ee },
  { at: 720, sun: 1, sky: 0x3f7cc4, horizon: 0xcfe0ee },
  { at: 990, sun: 0.85, sky: 0x4785c7, horizon: 0xcfe0ee },
  { at: 1110, sun: 0.3, sky: 0x45598a, horizon: 0xeaa375 },
  { at: 1170, sun: 0.03, sky: 0x202d50, horizon: 0x61607c },
  { at: 1200, sun: 0, sky: 0x101e38, horizon: 0x34465e },
  { at: MINUTES_PER_DAY, sun: 0, sky: 0x101e38, horizon: 0x34465e },
];

function mixHex(from: number, to: number, t: number): string {
  const mix = (shift: number) => {
    const a = (from >> shift) & 255;
    const b = (to >> shift) & 255;
    return Math.round(a + (b - a) * t);
  };
  return `#${((mix(16) << 16) | (mix(8) << 8) | mix(0)).toString(16).padStart(6, "0")}`;
}

export function dayPhase(minutes: number): { sun: number; sky: string; horizon: string; lampsOn: boolean } {
  const m = wrapMinutes(minutes);
  const i = KEYFRAMES.findIndex((frame) => m < frame.at);
  const a = KEYFRAMES[i - 1];
  const b = KEYFRAMES[i];
  const t = (m - a.at) / (b.at - a.at);
  const eased = t * t * (3 - 2 * t);
  return {
    sun: a.sun + (b.sun - a.sun) * eased,
    sky: mixHex(a.sky, b.sky, eased),
    horizon: mixHex(a.horizon, b.horizon, eased),
    lampsOn: m >= 19 * 60 || m < 7 * 60,
  };
}

export function isRaining(mode: GameSettings["rainMode"], minutes: number): boolean {
  // Hujan petang Auto boleh disambung tepat selepas muat tanpa menyimpan keadaan RNG.
  return mode === "on" || (mode === "auto" && minutes >= 16 * 60 && minutes < 17 * 60);
}
