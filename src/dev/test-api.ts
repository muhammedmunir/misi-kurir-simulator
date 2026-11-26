/** API ujian dev untuk E2E Playwright. Hanya wujud dalam `vite dev`. */
import { getWorldState, playerState, restoreWorld } from "@/components/3d/PlayerController";
import { getActionButton, getInteractButtonInfo } from "@/lib/interact-button";
import { useDeliveryStore } from "@/store/delivery";
import { useSceneStore } from "@/store/game";
import { useGameStateStore } from "@/store/gamestate";
import type { ManifestSummary } from "@/types/delivery";
import { readRenderInfo } from "./render-info";

export type { ManifestSummary } from "@/types/delivery";

export interface MksState {
  scene: string;
  phase: string;
  money: number | null;
  onFoot: boolean;
  nearbyZoneId: string | null;
  actionLabel: string;
  cargo: { id: string; status: string; target: string; cod: number }[];
  summary: ManifestSummary | null;
  /** Kedudukan watak (atau motor semasa memandu); y = 0 bermaksud di atas tanah. */
  pos: { x: number; y: number; z: number };
  /** Arah pandangan kamera (heading; hadapan = (sin h, cos h)). */
  heading: number;
}

export interface MksTestApi {
  state(): MksState;
  goTo(zoneId: string): void;
  renderInfo(): { calls: number; triangles: number } | null;
}

declare global {
  interface Window {
    __mks?: MksTestApi;
  }
}

export function createTestApi(): MksTestApi {
  return {
    state(): MksState {
      const scene = useSceneStore.getState().currentScene;
      const session = useDeliveryStore.getState().session;
      const player = useGameStateStore.getState().player;
      const world = getWorldState();

      // Hitung actionLabel
      const buttonInfo = getInteractButtonInfo(session, Date.now());
      const onFoot = world.onFoot;
      const actionLabel = getActionButton(buttonInfo, {
        onFoot,
        nearMotor: playerState.isNearMotor(),
        speed: playerState.getSpeed(),
      }).label;

      return {
        scene,
        phase: session.phase,
        money: player?.money ?? null,
        onFoot,
        nearbyZoneId: session.nearbyZone?.id ?? null,
        actionLabel,
        cargo: session.cargo.map((p) => ({
          id: p.id,
          status: p.status,
          target: session.targets[p.id] ?? "",
          cod: p.paymentMethod === "cod" ? p.codAmount : 0,
        })),
        summary: session.summary ?? null,
        pos: (({ x, y, z }) => ({ x, y, z }))(playerState.getPosition()),
        heading: playerState.getHeading(),
      };
    },

    goTo(zoneId: string): void {
      const zones = useDeliveryStore.getState().zones;
      const zone = zones.find((z) => z.id === zoneId);
      if (!zone) {
        throw new Error(`Zon tidak wujud: ${zoneId}`);
      }
      const motor = getWorldState().motor;
      restoreWorld({ pos: zone.position, onFoot: true, motor });
    },

    renderInfo() {
      return readRenderInfo();
    },
  };
}
