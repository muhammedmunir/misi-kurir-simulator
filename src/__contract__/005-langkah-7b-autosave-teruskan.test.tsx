/// <reference types="vite/client" />
/**
 * Kontrak Pelan 005 Langkah 7b — autosave di titik selamat + "Teruskan" di menu utama.
 * Ditulis oleh perancang. C9 TIDAK boleh menyunting fail ini.
 */
import { getWorldState, restoreWorld } from "@/components/3d/PlayerController";
import gameSceneSrc from "@/components/GameScene3D.tsx?raw";
import { MainMenu } from "@/components/MainMenu";
import { startAutosave } from "@/save/autosave";
import { type SaveBackend, saveBackends } from "@/save/backend";
import { buildSave } from "@/save/save-schema";
import { useDeliveryStore } from "@/store/delivery";
import { useSceneStore } from "@/store/game";
import { useGameStateStore } from "@/store/gamestate";
import { DESK, SHOP, deliveringTo, testDeps } from "@/test/delivery-fixtures";
import { Scene } from "@/types/scene";
import { act } from "react";
import { type Root, createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

function memory(initial: unknown = null) {
  let stored: string | null = initial === null ? null : JSON.stringify(initial);
  const b = {
    writes: 0,
    last: () => (stored === null ? null : JSON.parse(stored)),
    read: async () => (stored === null ? null : JSON.parse(stored)),
    write: async (data: unknown) => {
      b.writes += 1;
      stored = JSON.stringify(data);
    },
    clear: async () => {
      stored = null;
    },
  };
  return b satisfies SaveBackend;
}

const store = () => useDeliveryStore.getState();
const flush = () =>
  act(async () => {
    await new Promise((r) => setTimeout(r, 0));
  });

// ── Autosave ─────────────────────────────────────────────────

describe("startAutosave — simpan hanya di titik selamat", () => {
  let stop: () => void = () => {};

  beforeEach(() => {
    useGameStateStore.getState().createNewGame("Autosave");
    useDeliveryStore.setState({ deps: testDeps() });
    store().reset();
  });

  afterEach(() => {
    stop();
    store().reset();
  });

  it("imbas/muat tidak simpan; berangkat (delivering) simpan sekali", async () => {
    const backend = memory();
    stop = startAutosave(backend);
    store().setNearbyZone(DESK);
    store().interact(1000, { onFoot: true });
    const id = store().session.inbound[0].id;
    store().scan(id, 1000);
    store().load(id, 1000);
    await flush();
    expect(backend.writes).toBe(0);

    store().dispatch(1000);
    await flush();
    expect(backend.writes).toBe(1);
    expect(backend.last().session.phase).toBe("delivering");
  });

  it("serah terima berjaya → simpan dengan paket delivered", async () => {
    useDeliveryStore.setState({ session: { ...deliveringTo([SHOP]), nearbyZone: SHOP } });
    const backend = memory();
    stop = startAutosave(backend);
    store().interact(5000, { onFoot: true });
    store().takeProof();
    await flush();
    expect(backend.writes).toBe(0); // buka panel / ambil bukti bukan titik selamat

    store().confirmHandover(5000);
    await flush();
    expect(backend.writes).toBe(1);
    expect(backend.last().session.cargo[0].status).toBe("delivered");
  });

  it("penerima tiada → simpan dengan paket failed", async () => {
    useDeliveryStore.setState({ session: { ...deliveringTo([SHOP]), nearbyZone: SHOP } });
    const backend = memory();
    stop = startAutosave(backend);
    store().interact(5000, { onFoot: true });
    store().reportAbsent(5000);
    await flush();
    expect(backend.writes).toBe(1);
    expect(backend.last().session.cargo[0].status).toBe("failed");
  });

  it("tutup manifest di meja → simpan fasa complete", async () => {
    useDeliveryStore.setState({ session: { ...deliveringTo([SHOP]), nearbyZone: SHOP } });
    store().interact(5000, { onFoot: true });
    store().takeProof();
    store().confirmHandover(5000);
    const backend = memory();
    stop = startAutosave(backend);
    store().setNearbyZone(DESK);
    store().interact(9000, { onFoot: true });
    await flush();
    expect(backend.writes).toBe(1);
    expect(backend.last().session.phase).toBe("complete");
  });

  it("mesej, tick, zon berdekatan dan kedudukan tidak mencetuskan simpan", async () => {
    useDeliveryStore.setState({ session: { ...deliveringTo([SHOP]), nearbyZone: null } });
    const backend = memory();
    stop = startAutosave(backend);
    store().notify("hai", 1);
    store().tick(10_000);
    store().setNearbyZone(SHOP);
    store().setPlayerPosition({ x: 3, z: 4 });
    await flush();
    expect(backend.writes).toBe(0);
  });

  it("fungsi yang dipulangkan menghentikan autosave", async () => {
    useDeliveryStore.setState({ session: { ...deliveringTo([SHOP]), nearbyZone: SHOP } });
    const backend = memory();
    startAutosave(backend)();
    store().interact(5000, { onFoot: true });
    store().reportAbsent(5000);
    await flush();
    expect(backend.writes).toBe(0);
  });

  it("GameScene3D memulakan autosave dengan backend sebenar dan menghentikannya semasa unmount", () => {
    expect(gameSceneSrc).toContain("startAutosave(saveBackends.current)");
    expect(gameSceneSrc).toMatch(/useEffect\(\s*\(\)\s*=>\s*startAutosave\(saveBackends\.current\)/);
  });
});

// ── Menu utama: Teruskan ─────────────────────────────────────

describe("MainMenu — Teruskan", () => {
  let container: HTMLDivElement;
  let root: Root;
  const original = saveBackends.current;
  const text = () => container.textContent ?? "";
  const button = (label: string) =>
    [...container.querySelectorAll("button")].find((b) => b.textContent?.includes(label)) ?? null;

  function validSave() {
    useGameStateStore.getState().createNewGame("Simpanan");
    const p = useGameStateStore.getState().player;
    if (!p) throw new Error("tiada pemain");
    useGameStateStore.setState({ player: { ...p, money: 888 } });
    useDeliveryStore.setState({ session: deliveringTo([SHOP]) });
    restoreWorld({ pos: { x: 40, z: 9 }, onFoot: true, motor: { x: 41, z: 9, heading: 2 } });
    return JSON.parse(JSON.stringify(buildSave(1234)));
  }

  /** Keadaan seperti baru buka aplikasi: tiada pemain, permainan baharu. */
  function freshApp() {
    store().reset();
    useGameStateStore.setState({ player: null, isNewGame: true });
    restoreWorld({ pos: { x: 0, z: 0 }, onFoot: true, motor: { x: 2, z: 2, heading: 0 } });
    useSceneStore.setState({ currentScene: Scene.MENU, nextScene: null, isTransitioning: false });
  }

  beforeEach(() => {
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    saveBackends.current = original;
    store().reset();
  });

  it("tiada simpanan → tiada butang Teruskan", async () => {
    saveBackends.current = memory();
    freshApp();
    act(() => root.render(<MainMenu />));
    await flush();
    expect(button("Teruskan")).toBeNull();
    expect(button("Permainan Baru")).not.toBeNull();
  });

  it("simpanan sah → Teruskan memulihkan permainan dan masuk ke GAME", async () => {
    saveBackends.current = memory(validSave());
    freshApp();
    act(() => root.render(<MainMenu />));
    await flush();
    const b = button("Teruskan");
    if (!b) throw new Error(`butang Teruskan tiada; teks: ${text()}`);
    await act(async () => b.click());
    await flush();

    expect(useGameStateStore.getState().player?.name).toBe("Simpanan");
    expect(useGameStateStore.getState().player?.money).toBe(888);
    expect(store().session.phase).toBe("delivering");
    expect(getWorldState().pos).toEqual({ x: 40, z: 9 });
    expect(useSceneStore.getState().nextScene).toBe(Scene.GAME);
  });

  it("simpanan rosak → mesej ralat jelas, kekal di menu, Permainan Baru masih ada", async () => {
    saveBackends.current = memory({ ...validSave(), player: { name: 5 } });
    freshApp();
    act(() => root.render(<MainMenu />));
    await flush();
    const b = button("Teruskan");
    if (!b) throw new Error(`butang Teruskan tiada; teks: ${text()}`);
    await act(async () => b.click());
    await flush();

    const alert = container.querySelector('[role="alert"]');
    expect(alert?.textContent).toContain("Simpanan rosak");
    expect(useSceneStore.getState().nextScene).toBeNull();
    expect(useGameStateStore.getState().player).toBeNull();
    expect(button("Permainan Baru")).not.toBeNull();
  });

  it("backend gagal dibaca semasa buka menu → menu tetap dipaparkan tanpa Teruskan", async () => {
    saveBackends.current = {
      read: async () => {
        throw new Error("IDB disekat");
      },
      write: async () => {},
      clear: async () => {},
    };
    freshApp();
    act(() => root.render(<MainMenu />));
    await flush();
    expect(button("Teruskan")).toBeNull();
    expect(button("Permainan Baru")).not.toBeNull();
  });
});
