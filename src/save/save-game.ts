import { restoreWorld } from "@/components/3d/PlayerController";
import { createSession } from "@/lib/delivery-system";
import type { SaveBackend } from "@/save/backend";
import { migrate } from "@/save/migrate";
import { buildSave, validateSave } from "@/save/save-schema";
import { useDeliveryStore } from "@/store/delivery";
import { useGameStateStore } from "@/store/gamestate";

export async function saveNow(backend: SaveBackend, now: number): Promise<boolean> {
  const gameState = useGameStateStore.getState();

  if (!gameState.player) {
    return false;
  }

  try {
    const save = buildSave(now);
    await backend.write(save);
    useDeliveryStore.getState().notify("Tersimpan", now);
    return true;
  } catch {
    useDeliveryStore.getState().notify("Gagal menyimpan", now);
    return false;
  }
}

export async function loadSaved(backend: SaveBackend): Promise<{ ok: true } | { ok: false; error: string }> {
  let raw: unknown;
  try {
    raw = await backend.read();
  } catch {
    return { ok: false, error: "Gagal membaca simpanan" };
  }

  if (raw === null || raw === undefined) {
    return { ok: false, error: "Tiada simpanan" };
  }

  const migrated = migrate(raw);
  if (!migrated.ok) {
    return { ok: false, error: `Simpanan rosak: ${migrated.error}` };
  }

  const validated = validateSave(migrated.data);
  if (!validated.ok) {
    return { ok: false, error: `Simpanan rosak: ${validated.error}` };
  }

  const save = validated.save;

  // 1. Restore player, vehicles, settings
  useGameStateStore.setState({
    player: save.player,
    vehicles: save.vehicles,
    settings: save.settings,
    isNewGame: false,
  });

  // 2. Restore delivery session
  const baseSession = createSession();
  useDeliveryStore.setState({
    session: {
      ...baseSession,
      ...save.session,
    },
  });

  // 3. Restore world state
  restoreWorld(save.world);

  return { ok: true };
}
