/// <reference types="vite/client" />
/**
 * Kontrak Pelan 005 Langkah 8 — API ujian dev (`window.__mks`) untuk E2E.
 * Ditulis oleh perancang. C9 TIDAK boleh menyunting fail ini.
 */
import { getWorldState, playerState, restoreWorld } from "@/components/3d/PlayerController";
import { HandoverPanel } from "@/delivery/HandoverPanel";
import { ManifestSummaryPanel } from "@/delivery/ManifestSummaryPanel";
import { createTestApi } from "@/dev/test-api";
import { DELIVERY_ZONES } from "@/lib/delivery-system";
import { getActionButton, getInteractButtonInfo } from "@/lib/interact-button";
import mainSrc from "@/main.tsx?raw";
import { startAutosave } from "@/save/autosave";
import type { SaveBackend } from "@/save/backend";
import { useDeliveryStore } from "@/store/delivery";
import { useSceneStore } from "@/store/game";
import { useGameStateStore } from "@/store/gamestate";
import { INDUSTRI, SHOP, deliveringTo } from "@/test/delivery-fixtures";
import { Scene } from "@/types/scene";
import { type ReactElement, act } from "react";
import { createRoot } from "react-dom/client";
import { beforeEach, describe, expect, it } from "vitest";

describe("createTestApi().state()", () => {
  beforeEach(() => {
    useGameStateStore.getState().createNewGame("E2E");
    useDeliveryStore.getState().reset();
    useSceneStore.setState({ currentScene: Scene.GAME, nextScene: null });
  });

  it("mencerminkan stor sebenar: adegan, fasa, wang, kaki/motor, zon, kargo + sasaran", () => {
    const s = deliveringTo([SHOP, INDUSTRI]);
    useDeliveryStore.setState({ session: { ...s, nearbyZone: SHOP } });
    restoreWorld({ pos: { x: 5, z: 6 }, onFoot: false, motor: { x: 5, z: 6, heading: 0 } });

    const st = createTestApi().state();
    expect(st.scene).toBe(Scene.GAME);
    expect(st.phase).toBe("delivering");
    expect(st.money).toBe(useGameStateStore.getState().player?.money);
    expect(st.onFoot).toBe(false);
    expect(st.nearbyZoneId).toBe(SHOP.id);
    expect(st.summary).toBeNull();
    expect(st.cargo).toEqual(
      s.cargo.map((p) => ({ id: p.id, status: "out_for_delivery", target: s.targets[p.id], cod: 0 })),
    );
  });

  it("actionLabel = label butang tindakan sebenar (getActionButton + konteks motor)", () => {
    const s = { ...deliveringTo([SHOP]), nearbyZone: SHOP };
    useDeliveryStore.setState({ session: s });
    const expected = (onFoot: boolean) =>
      getActionButton(getInteractButtonInfo(s, Date.now()), {
        onFoot,
        nearMotor: playerState.isNearMotor(),
        speed: playerState.getSpeed(),
      }).label;

    restoreWorld({ pos: { x: 60, z: 29 }, onFoot: true, motor: { x: 0, z: 0, heading: 0 } });
    expect(createTestApi().state().actionLabel).toBe(expected(true));
    expect(createTestApi().state().actionLabel).toBe("SERAH PAKET");

    restoreWorld({ pos: { x: 60, z: 29 }, onFoot: false, motor: { x: 60, z: 29, heading: 0 } });
    expect(createTestApi().state().actionLabel).toBe("TURUN MOTOR");
  });

  it("tanpa pemain → money null", () => {
    useGameStateStore.setState({ player: null });
    expect(createTestApi().state().money).toBeNull();
  });

  it("state() memulangkan salinan baharu (data biasa, boleh di-JSON)", () => {
    const api = createTestApi();
    const st = api.state();
    expect(JSON.parse(JSON.stringify(st))).toEqual(st);
  });
});

describe("createTestApi().goTo()", () => {
  it("meletakkan pemain BERJALAN KAKI di kedudukan zon; motor tidak berubah", () => {
    restoreWorld({ pos: { x: 0, z: 0 }, onFoot: false, motor: { x: 7, z: 8, heading: 1 } });
    const api = createTestApi();
    for (const zone of DELIVERY_ZONES) {
      api.goTo(zone.id);
      const w = getWorldState();
      expect(w.pos).toEqual({ x: zone.position.x, z: zone.position.z });
      expect(w.onFoot).toBe(true);
      expect(w.motor).toEqual({ x: 7, z: 8, heading: 1 });
    }
  });

  it("zon tidak wujud → throw dengan nama zon", () => {
    expect(() => createTestApi().goTo("zone-tiada")).toThrow("zone-tiada");
  });
});

describe("main.tsx — API hanya dalam DEV, tidak dibundel ke produksi", () => {
  it("dipasang melalui import dinamik di bawah import.meta.env.DEV", () => {
    expect(mainSrc).toContain("import.meta.env.DEV");
    expect(mainSrc).toMatch(/import\(\s*["']\.\/dev\/test-api["']\s*\)/);
  });

  it("tiada import statik dev/test-api", () => {
    expect(mainSrc).not.toMatch(/^import[^;]*dev\/test-api/m);
  });
});

// ── Pepijat yang ditemui oleh E2E semasa menulis pelan ini ──────

describe("B15 — panel serah terima & ringkasan mesti boleh diklik", () => {
  // HUD (induk kedua-dua panel) ialah pointerEvents: "none"; dialog mesti membuka semula klik.
  function dialogPointerEvents(el: ReactElement): string {
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);
    act(() => root.render(el));
    const value = container.querySelector("dialog")?.style.pointerEvents ?? "(tiada dialog)";
    act(() => root.unmount());
    container.remove();
    return value;
  }

  it("HandoverPanel: <dialog> pointerEvents auto", () => {
    useGameStateStore.getState().createNewGame("B15");
    useDeliveryStore.getState().reset();
    useDeliveryStore.setState({ session: { ...deliveringTo([SHOP]), nearbyZone: SHOP } });
    useDeliveryStore.getState().interact(5000, { onFoot: true });
    expect(dialogPointerEvents(<HandoverPanel />)).toBe("auto");
  });

  it("ManifestSummaryPanel: <dialog> pointerEvents auto", () => {
    useDeliveryStore.setState({
      session: {
        ...useDeliveryStore.getState().session,
        summary: { manifestId: "m", delivered: 1, returned: 0, earned: 5, xp: 30, durationMs: 1000, codCollected: 0 },
      },
    });
    expect(dialogPointerEvents(<ManifestSummaryPanel />)).toBe("auto");
  });
});

describe("B16 — autosave selepas serahan mesti menyimpan wang yang sudah ditambah", () => {
  it("confirmHandover: wang dalam simpanan = wang pemain selepas ganjaran", async () => {
    useGameStateStore.getState().createNewGame("B16");
    useDeliveryStore.getState().reset();
    useDeliveryStore.setState({ session: { ...deliveringTo([SHOP]), nearbyZone: SHOP } });
    let saved: { player: { money: number; xp: number } } | null = null;
    const backend: SaveBackend = {
      read: async () => saved,
      write: async (d) => {
        saved = JSON.parse(JSON.stringify(d));
      },
      clear: async () => {},
    };
    const stop = startAutosave(backend);
    // Pelan 018 (dikemas kini oleh perancang): mood pelanggan dirawak; tetapkan "home" supaya serahan memberi ganjaran.
    createTestApi().setNextCustomer("home");
    const store = useDeliveryStore.getState();
    store.interact(5000, { onFoot: true });
    store.takeProof();
    const before = useGameStateStore.getState().player?.money ?? Number.NaN;
    store.confirmHandover(5000);
    await new Promise((r) => setTimeout(r, 0));
    stop();
    const after = useGameStateStore.getState().player;
    expect(after?.money).toBeGreaterThan(before);
    expect(saved).not.toBeNull();
    expect((saved as unknown as { player: { money: number } }).player.money).toBe(after?.money);
    expect((saved as unknown as { player: { xp: number } }).player.xp).toBe(after?.xp);
  });
});
