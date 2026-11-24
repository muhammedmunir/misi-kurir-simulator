/**
 * Kontrak semakan Pelan 005 Langkah 4 (selepas c36ace8).
 * Menangkap pepijat NavArrow yang tidak diliputi kontrak asal.
 * Ditulis oleh perancang. C9 TIDAK boleh menyunting fail ini.
 */
import { createSession } from "@/lib/delivery-system";
import { NavArrow } from "@/navigation/NavArrow";
import { useDeliveryStore } from "@/store/delivery";
import { DESK, SHOP, deliveringTo } from "@/test/delivery-fixtures";
import { act } from "react";
import { type Root, createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("NavArrow — kekal hidup sepanjang permainan", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    vi.useFakeTimers();
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    vi.useRealTimers();
    useDeliveryStore.getState().reset();
  });

  const advance = (ms: number) => act(() => vi.advanceTimersByTime(ms));

  it("muncul semula selepas manifest selesai dan sesi kembali idle", () => {
    // Manifest baru selesai: tiada sasaran, NavArrow kosong
    useDeliveryStore.setState({ session: { ...deliveringTo([SHOP]), phase: "complete" } });
    act(() => root.render(<NavArrow />));
    expect(container.textContent).toBe("");

    // tickSession auto-reset → idle: sasaran kini meja gudang
    act(() => useDeliveryStore.setState({ session: createSession() }));
    advance(300);
    expect(container.textContent).toContain(DESK.name);
  });

  it("hilang serta-merta bila panel gudang dibuka, walaupun pemain tidak bergerak", () => {
    useDeliveryStore.setState({ session: createSession() });
    act(() => root.render(<NavArrow />));
    expect(container.textContent).toContain(DESK.name);

    act(() => useDeliveryStore.setState({ session: { ...useDeliveryStore.getState().session, panelOpen: true } }));
    advance(300);
    expect(container.textContent).toBe("");
  });

  it("muncul semula bila panel gudang ditutup", () => {
    useDeliveryStore.setState({ session: { ...createSession(), panelOpen: true } });
    act(() => root.render(<NavArrow />));
    expect(container.textContent).toBe("");

    act(() => useDeliveryStore.setState({ session: { ...useDeliveryStore.getState().session, panelOpen: false } }));
    advance(300);
    expect(container.textContent).toContain(DESK.name);
  });

  it("bertukar ke alamat selepas berangkat, tanpa pemain bergerak", () => {
    useDeliveryStore.setState({ session: createSession() });
    act(() => root.render(<NavArrow />));
    expect(container.textContent).toContain(DESK.name);

    act(() => useDeliveryStore.setState({ session: deliveringTo([SHOP]) }));
    advance(300);
    expect(container.textContent).toContain(SHOP.name);
  });
});
