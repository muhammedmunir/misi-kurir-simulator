/**
 * Kontrak semakan Pelan 005 Langkah 9a — FpsOverlay mesti mengukur bingkai sebenar.
 * Ditulis oleh perancang. C9 TIDAK boleh menyunting fail ini.
 *
 * Pepijat: FpsOverlay mengira semula melalui setInterval(33 ms) dan memanggil tick(Date.now())
 * semasa render, jadi nombor yang dipaparkan ialah kadar setInterval (~30), bukan kadar bingkai.
 * Ujian telefon 9b akan merekod nombor palsu.
 */
import { FpsOverlay, shouldShowFps } from "@/dev/fps";
import { Profiler, act } from "react";
import { type Root, createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

/** Gantikan requestAnimationFrame dengan baris gilir manual supaya ujian mengawal masa bingkai. */
function fakeRaf() {
  let queue = new Map<number, FrameRequestCallback>();
  let nextId = 1;
  const orig = { raf: window.requestAnimationFrame, caf: window.cancelAnimationFrame };
  window.requestAnimationFrame = (cb) => {
    const id = nextId++;
    queue.set(id, cb);
    return id;
  };
  window.cancelAnimationFrame = (id) => {
    queue.delete(id);
  };
  return {
    pending: () => queue.size,
    /** Jalankan satu bingkai pada masa `t` (ms). */
    frame(t: number) {
      const cbs = [...queue.values()];
      queue = new Map();
      for (const cb of cbs) cb(t);
    },
    restore() {
      window.requestAnimationFrame = orig.raf;
      window.cancelAnimationFrame = orig.caf;
    },
  };
}

describe("FpsOverlay — ukur dengan requestAnimationFrame", () => {
  let container: HTMLDivElement;
  let root: Root;
  let raf: ReturnType<typeof fakeRaf>;
  let renders = 0;

  beforeEach(() => {
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    raf = fakeRaf();
    renders = 0;
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    act(() =>
      root.render(
        <Profiler id="fps" onRender={() => renders++}>
          <FpsOverlay />
        </Profiler>,
      ),
    );
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    raf.restore();
  });

  /** Jalankan `frames` bingkai, selang `dt` ms bermula dari `start`. */
  function play(start: number, frames: number, dt: number) {
    let t = start;
    for (let i = 0; i < frames; i++) {
      t += dt;
      act(() => raf.frame(t));
    }
    return t;
  }

  it("mendaftar requestAnimationFrame semasa mount", () => {
    expect(raf.pending()).toBeGreaterThan(0);
  });

  it("bingkai setiap 50 ms (3 s) → papar '20 FPS'; setiap 25 ms → '40 FPS'", () => {
    const t = play(0, 60, 50);
    expect(container.textContent).toContain("20 FPS");
    play(t, 120, 25);
    expect(container.textContent).toContain("40 FPS");
  });

  it("tidak render semula setiap bingkai: ≤ 2 kali sesaat (60 bingkai dalam 3 s → ≤ 8 render)", () => {
    const before = renders;
    play(0, 60, 50);
    expect(renders - before).toBeLessThanOrEqual(8);
    expect(renders - before).toBeGreaterThan(0);
  });

  it("berhenti mendaftar bingkai selepas unmount", () => {
    act(() => root.unmount());
    raf.frame(10);
    expect(raf.pending()).toBe(0);
    root = createRoot(container); // supaya afterEach boleh unmount dengan selamat
  });

  it("tidak menghalang klik HUD di bawahnya: pointerEvents none", () => {
    const el = container.firstElementChild as HTMLElement | null;
    expect(el?.style.pointerEvents).toBe("none");
  });
});

describe("shouldShowFps — parameter `fps` sebenar sahaja", () => {
  it("?nofps / ?fpsx bukan parameter fps", () => {
    expect(shouldShowFps(true, "?nofps=1")).toBe(false);
    expect(shouldShowFps(true, "?fpsx=1")).toBe(false);
    expect(shouldShowFps(true, "?fps")).toBe(true);
  });
});
