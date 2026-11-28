import { CAR_MODELS, carModelFor, carModelPath, trafficCarSize } from "@/components/3d/car-models";

const NPC_COLORS = ["#3b82f6", "#ef4444", "#22c55e", "#eab308", "#8b5cf6", "#06b6d4", "#f97316"];

const ROAD_VALUES: number[] = [];
for (let i = -3; i <= 3; i++) {
  ROAD_VALUES.push(i * 40);
}

/** Jarak lorong dari garis tengah jalan (jalan 12 lebar). */
export const LANE_OFFSET = 3;

/** Jarak garis berhenti dari pusat simpang (m). */
export const STOP_LINE = 8;
/** Masa menunggu di garis berhenti (s). */
export const STOP_SECONDS = 1.5;
/** Jarak minimum pusat-ke-pusat ke kereta atau pemain di hadapan (m); kereta 4–4.8 m (Pelan 025). */
export const FOLLOW_GAP = 7;
/** Had pecutan (m/s²). */
const ACCEL = 4;
/** Had brek (m/s²). */
const BRAKE = 9;
/** Pusingan dunia: kenderaan melimpah di ±200. */
const BOUND = 200;

export interface NPCTrafficVehicle {
  id: string;
  position: { x: number; z: number };
  heading: number;
  speed: number;
  color: string;
  roadAxis: "x" | "z";
  roadValue: number;
  direction: 1 | -1;
  /** Laju jelajah asal; diisi pada kemas kini pertama daripada speed. */
  cruise?: number;
  /** Baki masa menunggu di garis berhenti (s). */
  waitLeft?: number;
  /** Pusat simpang terakhir kereta berhenti; elak berhenti dua kali di simpang sama. */
  lastStop?: number | null;
}

export function generateNPCTraffic(count: number, rng: () => number = Math.random): NPCTrafficVehicle[] {
  const vehicles: NPCTrafficVehicle[] = [];

  for (let i = 0; i < count; i++) {
    const r = rng;
    const roadIdx = Math.floor(r() * ROAD_VALUES.length);
    const roadValue = ROAD_VALUES[roadIdx];
    const isZAxis = r() > 0.5;
    const direction = (r() > 0.5 ? 1 : -1) as 1 | -1;

    vehicles.push({
      id: `npc-${i}`,
      position: {
        // Pandu di sebelah kiri jalan (Malaysia): lorong LANE_OFFSET dari garis tengah.
        x: isZAxis ? roadValue + LANE_OFFSET * direction : (r() - 0.5) * 400,
        z: isZAxis ? (r() - 0.5) * 400 : roadValue - LANE_OFFSET * direction,
      },
      heading: isZAxis ? (direction === 1 ? 0 : Math.PI) : direction === 1 ? Math.PI / 2 : -Math.PI / 2,
      speed: 2 + r() * 4,
      color: NPC_COLORS[Math.floor(r() * NPC_COLORS.length)],
      roadAxis: isZAxis ? "z" : "x",
      roadValue,
      direction,
    });
  }

  return vehicles;
}

/** Simpan kedudukan mengikut paksi jalan (z untuk roadAxis "z", x sebaliknya). */
function axisPos(v: NPCTrafficVehicle): number {
  return v.roadAxis === "z" ? v.position.z : v.position.x;
}

/** Set kedudukan mengikut paksi jalan. */
function setAxisPos(v: NPCTrafficVehicle, value: number): void {
  if (v.roadAxis === "z") v.position.z = value;
  else v.position.x = value;
}

/**
 * Majukan trafik NPC: berhenti di garis simpang, mengekori kereta di hadapan,
 * berhenti untuk pemain dalam lorong, dan laju berubah beransur.
 * `ctx?.player` (opsi) ialah kedudukan pemain dunia untuk berhenti.
 */
export function updateNPCTraffic(
  vehicles: NPCTrafficVehicle[],
  delta: number,
  ctx?: { player?: { x: number; z: number } },
): NPCTrafficVehicle[] {
  return vehicles.map((src) => {
    const v: NPCTrafficVehicle = { ...src, position: { ...src.position } };
    const cruise = v.cruise ?? v.speed;
    v.cruise = cruise;
    v.waitLeft = Math.max(0, (v.waitLeft ?? 0) - delta);
    const dir = v.direction;
    const s = axisPos(v);

    // Jarak bebas (m) ke halangan terdekat: kereta di hadapan, pemain, atau garis berhenti.
    let free = Number.POSITIVE_INFINITY;
    let stopCenter: number | null = null;

    for (const o of vehicles) {
      if (o.id === v.id || o.roadAxis !== v.roadAxis || o.roadValue !== v.roadValue || o.direction !== dir) continue;
      const ahead = dir * (axisPos(o) - s);
      if (ahead > 0) free = Math.min(free, ahead - FOLLOW_GAP);
    }

    const player = ctx?.player;
    if (player) {
      const lateral = v.roadAxis === "z" ? Math.abs(player.x - v.position.x) : Math.abs(player.z - v.position.z);
      const ahead = v.roadAxis === "z" ? dir * (player.z - s) : dir * (player.x - s);
      if (lateral < 2 && ahead >= 0 && ahead <= 25) free = Math.min(free, ahead - FOLLOW_GAP);
    }

    // Garis simpang hadapan (pusat = gandaan 40 dalam julat -120…120).
    // Skip simpang yang kereta sudah berhenti di situ (lastStop) supaya
    // ia tidak berhenti dua kali di simpang yang sama.
    let center = dir * Math.ceil((dir * s + 1e-9) / 40) * 40;
    if (center - STOP_LINE * dir < s) center += 40 * dir;
    if (center === v.lastStop) center += 40 * dir;
    if (center >= -120 && center <= 120) {
      const line = center - STOP_LINE * dir;
      const dist = dir * (line - s);
      if (dist <= 0) {
        stopCenter = center;
        free = 0;
      } else {
        free = Math.min(free, dist);
      }
    }

    // Laju sasaran: 0 semasa menunggu; selain itu cruise dihadkan model brek.
    let target: number;
    if (v.waitLeft > 0) target = 0;
    else if (free <= 0) target = 0;
    else target = Math.min(cruise, Math.sqrt(2 * BRAKE * free));

    // Pecutan <= 4 m/s², brek <= 9 m/s² (tiada lompatan laju).
    let speed = v.speed;
    if (target < speed) speed = Math.max(target, speed - BRAKE * delta);
    else speed = Math.min(target, speed + ACCEL * delta);

    // Langkah kedudukan: displacement dihadkan kepada jarak bebas
    // supaya kereta tidak merempuh halangan; laju terus turun mengikut brek.
    // Semasa menunggu di garis berhenti, kereta pegang brek (tidak bergerak).
    let displacement = speed * delta;
    if (v.waitLeft > 0) displacement = 0;
    else if (free < Number.POSITIVE_INFINITY) displacement = Math.min(displacement, free);
    let s2 = s + displacement * dir;
    if (stopCenter !== null) s2 = stopCenter - STOP_LINE * dir;

    // Pusingan dunia -200…200.
    if (s2 > BOUND) s2 = -BOUND;
    else if (s2 < -BOUND) s2 = BOUND;

    setAxisPos(v, s2);
    v.speed = speed;
    if (stopCenter !== null) {
      v.waitLeft = STOP_SECONDS;
      v.lastStop = stopCenter;
    }
    return v;
  });
}

// -- Kedudukan semasa trafik untuk collision pemain --

type Rect = { minX: number; maxX: number; minZ: number; maxZ: number };

let live: readonly NPCTrafficVehicle[] = [];

/** Dipanggil oleh `NPCTraffic` setiap frame selepas kenderaan bergerak. */
export function setLiveTraffic(vehicles: readonly NPCTrafficVehicle[]): void {
  live = vehicles;
}

/** Kotak badan kenderaan pada satah XZ; trafik sentiasa sejajar paksi. */
export function liveTrafficRects(): Rect[] {
  return live.map((v, i) => {
    const { w, d } = trafficCarSize(carModelPath(CAR_MODELS[carModelFor(i)]));
    const halfX = (v.roadAxis === "z" ? w : d) / 2;
    const halfZ = (v.roadAxis === "z" ? d : w) / 2;
    return {
      minX: v.position.x - halfX,
      maxX: v.position.x + halfX,
      minZ: v.position.z - halfZ,
      maxZ: v.position.z + halfZ,
    };
  });
}
