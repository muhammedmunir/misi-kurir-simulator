import { type WorldState, getWorldState } from "@/components/3d/PlayerController";
import { PACKET_TRANSITIONS } from "@/delivery/packet";
import { DELIVERY_ZONES } from "@/lib/delivery-system";
import { useDeliveryStore } from "@/store/delivery";
import { useGameStateStore } from "@/store/gamestate";
import type { DeliverySession } from "@/types/delivery";
import type { GameSettings, Manifest, Packet, PacketStatus, Player, Vehicle } from "@/types/game";

export const SAVE_VERSION = 1;

/** Subset of DeliverySession that is persisted. */
export type PersistedSession = Pick<
  DeliverySession,
  "phase" | "inbound" | "cargo" | "targets" | "manifest" | "tally" | "summary" | "completedAt"
>;

export interface SaveV1 {
  version: 1;
  savedAt: number;
  player: Player;
  vehicles: Vehicle[];
  settings: GameSettings;
  world: WorldState;
  session: PersistedSession;
}

export function buildSave(now: number): SaveV1 {
  const gameState = useGameStateStore.getState();
  const deliveryState = useDeliveryStore.getState();
  const world = getWorldState();

  const session: PersistedSession = {
    phase: deliveryState.session.phase,
    inbound: deliveryState.session.inbound,
    cargo: deliveryState.session.cargo,
    targets: deliveryState.session.targets,
    manifest: deliveryState.session.manifest,
    tally: deliveryState.session.tally,
    summary: deliveryState.session.summary,
    completedAt: deliveryState.session.completedAt,
  };

  if (!gameState.player) {
    throw new Error("Tiada pemain untuk disimpan");
  }

  return {
    version: SAVE_VERSION,
    savedAt: now,
    player: gameState.player,
    vehicles: gameState.vehicles,
    settings: gameState.settings,
    world,
    session,
  };
}

function isFiniteNumber(n: unknown): n is number {
  return typeof n === "number" && Number.isFinite(n);
}

function isString(s: unknown): s is string {
  return typeof s === "string";
}

function isBoolean(b: unknown): b is boolean {
  return typeof b === "boolean";
}

function isObject(o: unknown): o is Record<string, unknown> {
  return typeof o === "object" && o !== null && !Array.isArray(o);
}

function isArray<T>(a: unknown, check?: (item: unknown) => item is T): a is T[] {
  if (!Array.isArray(a)) return false;
  if (check) return a.every(check);
  return true;
}

function validatePacket(p: unknown): p is Packet {
  if (!isObject(p)) return false;
  if (!isString(p.id)) return false;
  const status = p.status;
  if (!isString(status)) return false;
  if (!Object.keys(PACKET_TRANSITIONS).includes(status as PacketStatus)) return false;
  return true;
}

function validateZoneId(id: unknown): id is string {
  if (!isString(id)) return false;
  return DELIVERY_ZONES.some((z) => z.id === id);
}

function validatePhase(p: unknown): p is DeliverySession["phase"] {
  return isString(p) && ["idle", "loading", "delivering", "returning", "complete"].includes(p);
}

function validateManifest(m: unknown): m is Manifest | null {
  if (m === null) return true;
  if (!isObject(m)) return false;
  if (!isString(m.id)) return false;
  if (!isArray(m.packets, isString)) return false;
  if (!isString(m.status)) return false;
  if (!["open", "closed", "archived"].includes(m.status)) return false;
  if (m.status === "open") {
    // Every cargo item must be in manifest.packets
    // We check this at a higher level where we have access to cargo
  }
  return true;
}

function validateWorld(w: unknown): w is WorldState {
  if (!isObject(w)) return false;
  if (!isObject(w.pos) || !isFiniteNumber(w.pos.x) || !isFiniteNumber(w.pos.z)) return false;
  if (w.pos.x < -1000 || w.pos.x > 1000 || w.pos.z < -1000 || w.pos.z > 1000) return false;
  if (
    !isObject(w.motor) ||
    !isFiniteNumber(w.motor.x) ||
    !isFiniteNumber(w.motor.z) ||
    !isFiniteNumber(w.motor.heading)
  )
    return false;
  if (w.motor.x < -1000 || w.motor.x > 1000 || w.motor.z < -1000 || w.motor.z > 1000) return false;
  if (!isBoolean(w.onFoot)) return false;
  return true;
}

export function validateSave(raw: unknown): { ok: true; save: SaveV1 } | { ok: false; error: string } {
  if (!isObject(raw)) return { ok: false, error: "Simpanan bukan objek" };

  if (raw.version !== 1) return { ok: false, error: "Versi save tidak disokong" };
  if (!isFiniteNumber(raw.savedAt)) return { ok: false, error: "savedAt tidak sah" };

  if (
    !isObject(raw.player) ||
    !isString(raw.player.name) ||
    !isFiniteNumber(raw.player.money) ||
    raw.player.money < 0 ||
    !isFiniteNumber(raw.player.xp) ||
    raw.player.xp < 0
  ) {
    return { ok: false, error: "Data pemain tidak sah" };
  }

  if (!validateWorld(raw.world)) return { ok: false, error: "Data dunia tidak sah" };

  if (!isObject(raw.session)) return { ok: false, error: "Sesi tidak sah" };

  const session = raw.session as Record<string, unknown>;

  if (!validatePhase(session.phase)) return { ok: false, error: "Fasa tidak dikenali" };

  if (!isArray(session.inbound, validatePacket)) return { ok: false, error: "Inbound tidak sah" };
  if (!isArray(session.cargo, validatePacket)) return { ok: false, error: "Kargo tidak sah" };

  // Validate targets: every value must be a valid zone id
  if (!isObject(session.targets)) return { ok: false, error: "Targets tidak sah" };
  for (const v of Object.values(session.targets)) {
    if (!validateZoneId(v)) return { ok: false, error: "Sasaran zon tidak wujud" };
  }

  if (!validateManifest(session.manifest)) return { ok: false, error: "Manifest tidak sah" };

  // Cross-check: if manifest is open, every cargo packet must be in manifest.packets
  if (session.manifest && isObject(session.manifest) && session.manifest.status === "open") {
    const manifestPackets = new Set((session.manifest as Manifest).packets);
    for (const p of session.cargo as Packet[]) {
      if (!manifestPackets.has(p.id)) return { ok: false, error: "Kargo tiada dalam manifest terbuka" };
    }
  }

  if (
    !isObject(session.tally) ||
    !isFiniteNumber(session.tally.earned) ||
    session.tally.earned < 0 ||
    !isFiniteNumber(session.tally.xp) ||
    session.tally.xp < 0
  ) {
    return { ok: false, error: "Tally tidak sah" };
  }

  if (!isArray(raw.vehicles)) return { ok: false, error: "Kenderaan tidak sah" };
  if (!isObject(raw.settings)) return { ok: false, error: "Tetapan tidak sah" };

  return { ok: true, save: raw as unknown as SaveV1 };
}
