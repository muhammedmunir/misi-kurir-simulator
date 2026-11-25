/**
 * Kontrak Pelan 005 Langkah 10 — pepijat yang ditemui pada telefon sebenar (Langkah 9b, Redmi 9).
 * Ditulis oleh perancang. C9 TIDAK boleh menyunting fail ini.
 *
 * B18: panel bottom-sheet (.wh-panel) mesti boleh ditatal dalam viewport rendah (landskap 823×309).
 *      Bukti sebenar dalam E2E tests/contract/e2e/landscape-panels.spec.ts; di sini semakan CSS.
 * B19: kad status HUD mesti mengikut naik/turun motor tanpa perubahan stor lain.
 * B20: mod sentuh tidak menyebut kekunci E.
 */
import { restoreWorld } from "@/components/3d/PlayerController";
import { HUD } from "@/components/HUD";
import { useDeliveryStore } from "@/store/delivery";
import { useSceneStore } from "@/store/game";
import { useGameStateStore } from "@/store/gamestate";
import { Scene } from "@/types/scene";
import { act } from "react";
import { type Root, createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Vitest memulangkan rentetan kosong untuk `.css?raw`, jadi baca terus dari cakera.
// Import dinamik bertali supaya tsc tidak memerlukan @types/node (projek tidak memasangnya).
const NODE_FS = "node:fs";
type NodeFs = { readFileSync(path: string, encoding: "utf8"): string };
const { readFileSync } = (await import(/* @vite-ignore */ NODE_FS)) as NodeFs;
// Laluan relatif kepada akar projek (cwd Vitest).
const css = readFileSync("src/index.css", "utf8");

function ruleBody(selector: string): string {
  const esc = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const m = css.match(new RegExp(`^${esc}\\s*\\{([^}]*)\\}`, "m"));
  return m?.[1] ?? "";
}

describe("B18 — panel bawah boleh ditatal dalam landskap", () => {
  it(".wh-panel: overflow-y auto + overscroll-behavior contain, max-height kekal", () => {
    const body = ruleBody(".wh-panel");
    expect(body, "peraturan .wh-panel wujud").not.toBe("");
    expect(body).toMatch(/overflow-y:\s*auto\s*;/);
    expect(body).toMatch(/overscroll-behavior:\s*contain\s*;/);
    expect(body).toMatch(/max-height:\s*min\(78dvh,\s*640px\)\s*;/);
  });
});

// ── Pembantu render HUD ────────────────────────────────────────

let root: Root | null = null;
let container: HTMLDivElement | null = null;

function renderHud(): HTMLDivElement {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => root?.render(<HUD />));
  return container;
}

function unmount() {
  if (root) act(() => root?.unmount());
  container?.remove();
  root = null;
  container = null;
}

const WALK = { pos: { x: 0, z: 0 }, onFoot: true, motor: { x: 40, z: 40, heading: 0 } };
const RIDE = { pos: { x: 0, z: 0 }, onFoot: false, motor: { x: 0, z: 0, heading: 0 } };

function setUrl(search: string) {
  window.history.replaceState(null, "", `/${search}`);
}

function stubPointer(coarse: boolean) {
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    writable: true,
    value: (q: string) => ({
      matches: coarse && q.includes("coarse"),
      media: q,
      onchange: null,
      addEventListener() {},
      removeEventListener() {},
      addListener() {},
      removeListener() {},
      dispatchEvent: () => false,
    }),
  });
}

beforeEach(() => {
  useGameStateStore.getState().createNewGame("Telefon");
  useDeliveryStore.getState().reset();
  useSceneStore.setState({ currentScene: Scene.GAME, nextScene: null });
  restoreWorld(WALK);
  setUrl("");
  stubPointer(false);
});

afterEach(() => {
  unmount();
  vi.useRealTimers();
  setUrl("");
});

describe("B19 — kad status HUD mengikut keadaan motor", () => {
  it("Berjalan → naik motor → 'Memandu Motor' dalam ≤ 300 ms, tanpa perubahan stor lain", () => {
    vi.useFakeTimers();
    const el = renderHud();
    expect(el.textContent).toContain("Berjalan");
    expect(el.textContent).not.toContain("Memandu Motor");

    act(() => {
      restoreWorld(RIDE);
      vi.advanceTimersByTime(300);
    });
    expect(el.textContent).toContain("Memandu Motor");
    expect(el.textContent).toMatch(/\d+ km\/j/);

    act(() => {
      restoreWorld(WALK);
      vi.advanceTimersByTime(300);
    });
    expect(el.textContent).toContain("Berjalan");
    expect(el.textContent).not.toContain("Memandu Motor");
  });

  it("pemasa dibersihkan semasa unmount", () => {
    vi.useFakeTimers();
    const before = vi.getTimerCount();
    renderHud();
    unmount();
    expect(vi.getTimerCount()).toBe(before);
  });
});

describe("B20 — teks petunjuk ikut mod input", () => {
  it("mod sentuh (?touch=1): tiada 'tekan E'; guna 'ketik butang tindakan'", () => {
    setUrl("?touch=1");
    const el = renderHud();
    const text = el.textContent ?? "";
    expect(text).not.toMatch(/tekan E\b/i);
    expect(text).toMatch(/Ketik butang tindakan untuk naik motor/);
    expect(text).toMatch(/Masuk gudang, ketik butang tindakan di meja sortir/);
  });

  it("mod sentuh melalui pointer: coarse (telefon sebenar, tanpa ?touch)", () => {
    stubPointer(true);
    const el = renderHud();
    expect(el.textContent).not.toMatch(/tekan E\b/i);
    expect(el.textContent).toMatch(/ketik butang tindakan/i);
  });

  it("mod sentuh semasa memandu: 'turun motor / interaksi' tanpa E", () => {
    setUrl("?touch=1");
    restoreWorld(RIDE);
    const el = renderHud();
    expect(el.textContent).toMatch(/Ketik butang tindakan untuk turun motor \/ interaksi/);
    expect(el.textContent).not.toMatch(/tekan E\b/i);
  });

  it("desktop (tetikus, tanpa ?touch): kekalkan 'Tekan E'", () => {
    const el = renderHud();
    expect(el.textContent).toMatch(/Tekan E untuk naik motor/);
    expect(el.textContent).toMatch(/Masuk gudang, tekan E di meja sortir/);
    expect(el.textContent).not.toMatch(/ketik butang/i);
  });
});
