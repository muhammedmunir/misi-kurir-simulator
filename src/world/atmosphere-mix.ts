import { dayPhase } from "./daytime";

const OVERCAST = "#6b7685";

function mixColor(from: string, to: string, amount: number): string {
  const a = Number.parseInt(from.slice(1), 16);
  const b = Number.parseInt(to.slice(1), 16);
  const channel = (shift: number) => {
    const start = (a >> shift) & 255;
    const end = (b >> shift) & 255;
    return Math.round(start + (end - start) * amount);
  };
  return `#${((channel(16) << 16) | (channel(8) << 8) | channel(0)).toString(16).padStart(6, "0")}`;
}

function warmBand(minutes: number, start: number, peak: number, end: number): number {
  return Math.max(0, Math.min((minutes - start) / (peak - start), (end - minutes) / (end - peak)));
}

export function mixAtmosphere(minutes: number, wet: boolean) {
  const phase = dayPhase(minutes);
  const day = 24 * 60;
  const m = ((minutes % day) + day) % day;
  const warmth = Math.max(
    warmBand(m, 6 * 60 + 30, 6 * 60 + 50, 7 * 60 + 15),
    warmBand(m, 18 * 60 + 45, 19 * 60, 19 * 60 + 30),
  );
  const sky = mixColor(phase.sky, "#94586d", warmth * 0.65);
  const horizon = mixColor(phase.horizon, "#f4a574", warmth * 0.85);
  // Mendung malam kekal gelap: awan tidak menerima cahaya matahari selepas senja.
  const cloud = mixColor("#242e42", OVERCAST, phase.sun);
  return {
    ...phase,
    sky: wet ? mixColor(sky, cloud, 0.8) : sky,
    horizon: wet ? mixColor(horizon, cloud, 0.78) : horizon,
    fogNear: wet ? 45 : 90,
    fogFar: wet ? 200 : 320,
    sunIntensity: 2.4 * phase.sun * (wet ? 0.55 : 1),
    sunColor: wet ? mixColor("#fff1d8", OVERCAST, 0.42) : "#fff1d8",
    hemisphereIntensity: 0.4 + phase.sun * (wet ? 0.5 : 0.75),
    hemisphereColor: wet ? mixColor("#d7e9ff", OVERCAST, 0.52) : "#d7e9ff",
  };
}
