import { HandoverPanel } from "@/delivery/HandoverPanel";
import { codChange } from "@/delivery/cod";
import { createTestApi } from "@/dev/test-api";
import { useDeliveryStore } from "@/store/delivery";
import { useGameStateStore } from "@/store/gamestate";
import { DESK, INDUSTRI, SHOP, deliveringTo, testDeps } from "@/test/delivery-fixtures";
import { act } from "react";
import { type Root, createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

const store = useDeliveryStore.getState;
const money = () => useGameStateStore.getState().player?.money ?? Number.NaN;
const onFoot = { onFoot: true };

let root: Root;
let container: HTMLDivElement;
const button = (label: string) => Array.from(container.querySelectorAll("button")).find((b) => b.textContent === label);
function click(label: string) {
  const target = button(label);
  if (!target) throw new Error(`Butang tiada: ${label}`);
  act(() => target.click());
}
function prepare(rolls: number[], zone = SHOP, cod = false) {
  const session = deliveringTo([zone]);
  if (cod) session.cargo = session.cargo.map((p) => ({ ...p, paymentMethod: "cod", codAmount: 14 }));
  act(() => useDeliveryStore.setState({ deps: testDeps(rolls), session: { ...session, nearbyZone: zone } }));
}
function open(now = 5000) {
  act(() => {
    expect(store().interact(now, onFoot).result?.action).toBe("open_handover");
  });
}
function closeAtDesk() {
  act(() => {
    store().setNearbyZone(DESK);
    store().interact(Date.now() + 2000, onFoot);
  });
}

beforeEach(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  store().reset();
  useGameStateStore.getState().createNewGame("Ujian");
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => root.render(<HandoverPanel />));
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  useDeliveryStore.setState(useDeliveryStore.getInitialState());
  useGameStateStore.setState(useGameStateStore.getInitialState());
});

describe("Pilihan pelanggan pada panel serah terima", () => {
  it("mengekalkan aliran biasa apabila penerima ada", () => {
    prepare([0.5]);
    open();
    const before = money();
    expect(button("Penerima tiada")).toBeDefined();
    expect(button("Serahkan paket")?.disabled).toBe(true);
    click("Ambil bukti");
    click("Serahkan paket");
    expect(store().session.cargo[0].status).toBe("delivered");
    expect(money()).toBeGreaterThan(before);
  });

  it("membayar 80% bagi titipan dan tidak mendepositkan COD yang tidak dikutip", () => {
    prepare([0.8, 0.2, 0.5, 0.5], SHOP, true);
    open();
    const before = money();
    expect(container.textContent).toContain("Tiada orang di rumah");
    expect(container.querySelector('[aria-label^="Baki"]')).toBeNull();
    act(() => store().collectCod(codChange(14), 5100));
    expect(store().session.handover?.codCollected).toBeUndefined();
    click("Titip pada jiran");
    expect(store().session.cargo[0].status).toBe("delivered");
    closeAtDesk();
    expect(store().session.summary?.codCollected).toBe(0);
    const discounted = money() - before;

    prepare([0.5]);
    open();
    const baseline = money();
    click("Ambil bukti");
    click("Serahkan paket");
    expect(discounted).toBeCloseTo((money() - baseline) * 0.8);
  });

  it("melaporkan penerima tiada tanpa ganjaran apabila jiran tidak tersedia", () => {
    prepare([0.8, 0.5]);
    open();
    const before = money();
    expect(button("Titip pada jiran")).toBeUndefined();
    click("Penerima tiada");
    closeAtDesk();
    expect(store().session.cargo[0].status).toBe("returned");
    expect(store().session.summary?.refused).toBe(0);
    expect(money()).toBe(before);
  });

  it("memerlukan bukti dan COD untuk serahan kepada jiran dengan ganjaran penuh", () => {
    prepare([0.9, 0.5], SHOP, true);
    open();
    const before = money();
    expect(button("Serahkan kepada jiran")?.disabled).toBe(true);
    click("Ambil bukti");
    expect(button("Serahkan kepada jiran")?.disabled).toBe(true);
    const correct = container.querySelector<HTMLButtonElement>(`[aria-label="Baki ${codChange(14).toFixed(2)}"]`);
    expect(correct).not.toBeNull();
    act(() => correct?.click());
    click("Serahkan kepada jiran");
    expect(store().session.cargo[0].status).toBe("delivered");
    closeAtDesk();
    expect(store().session.summary?.codCollected).toBe(14);
    const earned = money() - before;

    prepare([0.5]);
    open();
    const baseline = money();
    click("Ambil bukti");
    click("Serahkan paket");
    expect(earned).toBe(money() - baseline);
  });

  it("merekod penolakan dan mengiranya selepas paket dipulangkan", () => {
    prepare([0.95], SHOP, true);
    open();
    const before = money();
    expect(container.textContent).toContain("Pelanggan menolak paket");
    expect(Array.from(container.querySelectorAll("button"), (b) => b.textContent)).toEqual(["Pelanggan menolak"]);
    click("Pelanggan menolak");
    expect(store().session.cargo[0].history.slice(-1)[0]).toMatchObject({ status: "failed", reason: "refused" });
    closeAtDesk();
    expect(store().session.cargo[0].status).toBe("returned");
    expect(store().session.summary).toMatchObject({ returned: 1, refused: 1, codCollected: 0 });
    expect(money()).toBe(before);
  });

  it("menghabiskan override hanya apabila panel dibuka, termasuk di zon industri", () => {
    prepare([0.5], INDUSTRI);
    createTestApi().setNextCustomer("refuse");
    act(() => store().interact(4000, { onFoot: false }));
    open();
    expect(store().session.handover?.mood).toBe("absent");
    prepare([0.5]);
    open();
    expect(store().session.handover?.mood).toBe("home");

    prepare([0.5]);
    createTestApi().setNextCustomer("neighbour");
    act(() => store().interact(4000, { onFoot: false }));
    open();
    expect(store().session.handover?.mood).toBe("neighbour");
    click("Batal");
    open(6000);
    expect(store().session.handover?.mood).toBe("home");
  });
});
