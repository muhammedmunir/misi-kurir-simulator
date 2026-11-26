/**
 * Kontrak Pelan 006b — mesej "Baki salah" kelihatan dalam Panel Serah Terima,
 * dan shuffleArray kembali kepada Fisher-Yates seragam.
 * Ditulis oleh perancang. C9 TIDAK boleh menyunting fail ini.
 */
import { HandoverPanel } from "@/delivery/HandoverPanel";
import { COD_WRONG_CHANGE, collectCod } from "@/delivery/cod";
import { shuffleArray } from "@/lib/utils";
import { useDeliveryStore } from "@/store/delivery";
import { useGameStateStore } from "@/store/gamestate";
import { SHOP, deliveringTo, testDeps } from "@/test/delivery-fixtures";
import type { DeliverySession } from "@/types/delivery";
import { act } from "react";
import { type Root, createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const onFoot = { onFoot: true };

function withCod(s: DeliverySession, amount: number): DeliverySession {
  return {
    ...s,
    cargo: s.cargo.map((p, i) => (i === 0 ? { ...p, paymentMethod: "cod" as const, codAmount: amount } : p)),
  };
}

describe("COD_WRONG_CHANGE", () => {
  it("dieksport dan digunakan oleh collectCod bagi baki salah", () => {
    expect(COD_WRONG_CHANGE).toBe("Baki salah — kira semula");
    useDeliveryStore.getState().reset();
    useDeliveryStore.setState({
      deps: testDeps(),
      session: { ...withCod(deliveringTo([SHOP]), 37.5), nearbyZone: SHOP },
    });
    useDeliveryStore.getState().interact(2000, onFoot);
    const s = collectCod(useDeliveryStore.getState().session, 13.5, 2100);
    expect(s.interactionMessage).toBe(COD_WRONG_CHANGE);
  });
});

describe("HandoverPanel — mesej baki salah dalam panel", () => {
  let container: HTMLDivElement;
  let root: Root;
  const msgs = () => [...container.querySelectorAll("dialog output.wh-panel__msg")].map((o) => o.textContent?.trim());
  const button = (label: string) => container.querySelector<HTMLButtonElement>(`button[aria-label="${label}"]`);
  const byText = (text: string) =>
    [...container.querySelectorAll("button")].find((b) => b.textContent?.trim() === text) ?? null;

  beforeEach(() => {
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    useGameStateStore.getState().createNewGame("006b");
    useDeliveryStore.getState().reset();
    useDeliveryStore.setState({
      deps: testDeps(),
      session: { ...withCod(deliveringTo([SHOP]), 37.5), nearbyZone: SHOP },
    });
    act(() => {
      useDeliveryStore.getState().interact(2000, onFoot);
    });
    act(() => root.render(<HandoverPanel />));
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    useDeliveryStore.getState().reset();
  });

  it("tiada <output> semasa panel dibuka atau selepas Ambil bukti (mesej lain kekal di HUD)", () => {
    expect(msgs()).toEqual([]);
    act(() => byText("Ambil bukti")?.click());
    expect(msgs()).toEqual([]);
  });

  it("baki salah → <output class='wh-panel__msg'> dengan COD_WRONG_CHANGE di dalam dialog", () => {
    act(() => button("Baki 13.50")?.click());
    expect(msgs()).toEqual([COD_WRONG_CHANGE]);
  });

  it("baki betul selepas salah → mesej salah hilang, nota 'COD diterima' kekal", () => {
    act(() => button("Baki 13.50")?.click());
    act(() => button("Baki 12.50")?.click());
    expect(msgs()).toEqual([]);
    expect(container.textContent).toContain("COD diterima");
  });
});

describe("shuffleArray — Fisher-Yates seragam (tiada jaminan susunan berbeza)", () => {
  afterEach(() => vi.restoreAllMocks());

  it("Math.random ≈ 1 → j = i setiap langkah → susunan asal dikembalikan", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.9999);
    expect(shuffleArray([1, 2, 3, 4, 5])).toEqual([1, 2, 3, 4, 5]);
  });

  it("Math.random = 0 → pusingan Fisher-Yates yang dijangka; input tidak diubah", () => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    const input = [1, 2, 3, 4];
    expect(shuffleArray(input)).toEqual([2, 3, 4, 1]);
    expect(input).toEqual([1, 2, 3, 4]);
  });
});
