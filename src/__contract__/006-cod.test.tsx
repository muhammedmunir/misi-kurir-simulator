import { HandoverPanel } from "@/delivery/HandoverPanel";
import { ManifestSummaryPanel } from "@/delivery/ManifestSummaryPanel";
/**
 * Kontrak Pelan 006 — COD (bayaran tunai semasa serahan). Master prompt H.7, I, K.
 * Ditulis oleh perancang. C9 TIDAK boleh menyunting fail ini.
 *
 * Mekanik: pelanggan membayar dengan satu wang kertas (RM20/50/100, yang terkecil ≥ jumlah).
 * Kurir memilih baki yang betul daripada 3 pilihan. Paket COD tidak boleh diserahkan sebelum
 * bayaran dikutip. Tunai COD bukan pendapatan kurir: ia disetor ke gudang semasa manifest ditutup.
 */
import { codChange, codChangeOptions, codCollectedTotal, codNote, collectCod } from "@/delivery/cod";
import { completeHandover, failHandover, takeProof } from "@/delivery/handover";
import { interact } from "@/lib/delivery-system";
import { formatRinggit } from "@/lib/utils";
import type { SaveBackend } from "@/save/backend";
import { loadSaved } from "@/save/save-game";
import { buildSave } from "@/save/save-schema";
import { useDeliveryStore } from "@/store/delivery";
import { useGameStateStore } from "@/store/gamestate";
import { DESK, INDUSTRI, SHOP, deliveringTo, testDeps } from "@/test/delivery-fixtures";
import type { DeliverySession, ManifestSummary } from "@/types/delivery";
import { WarehousePanel } from "@/warehouse/WarehousePanel";
import { generateInbound } from "@/warehouse/warehouse-logic";
import { act } from "react";
import { type Root, createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

const onFoot = { onFoot: true };

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

/** Jadikan paket ke-i dalam kargo sebagai COD. */
function withCod(s: DeliverySession, amounts: Record<number, number>): DeliverySession {
  return {
    ...s,
    cargo: s.cargo.map((p, i) => (i in amounts ? { ...p, paymentMethod: "cod" as const, codAmount: amounts[i] } : p)),
  };
}

function openAt(s: DeliverySession, zone: typeof SHOP, now: number): DeliverySession {
  const opened = interact(s, zone, now, testDeps(), onFoot);
  expect(opened.result.action).toBe("open_handover");
  return opened.session;
}

describe("wang kertas dan baki", () => {
  it("codNote: wang kertas terkecil RM20/50/100 yang ≥ jumlah", () => {
    expect(codNote(10)).toBe(20);
    expect(codNote(20)).toBe(20);
    expect(codNote(20.5)).toBe(50);
    expect(codNote(37.5)).toBe(50);
    expect(codNote(50)).toBe(50);
    expect(codNote(95.5)).toBe(100);
  });

  it("codChange: wang kertas − jumlah, tepat ke sen", () => {
    expect(codChange(37.5)).toBe(12.5);
    expect(codChange(20)).toBe(0);
    expect(codChange(95.5)).toBe(4.5);
    expect(codChange(49.5)).toBe(0.5);
  });

  // Kedudukan jawapan berubah supaya tidak sentiasa di tengah:
  // k = round(jumlah × 2) mod 3; mula = max(0, baki − k); pilihan = [mula, mula + 1, mula + 2].
  it("codChangeOptions: 3 pilihan menaik berjarak RM1; jawapan betul pada kedudukan k", () => {
    expect(codChangeOptions(37.5)).toEqual([12.5, 13.5, 14.5]); // k 0
    expect(codChangeOptions(36.5)).toEqual([12.5, 13.5, 14.5]); // k 1
    expect(codChangeOptions(95.5)).toEqual([2.5, 3.5, 4.5]); // k 2
    expect(codChangeOptions(20)).toEqual([0, 1, 2]); // k 1, dihadkan pada 0
    expect(codChangeOptions(49.5)).toEqual([0.5, 1.5, 2.5]); // k 0
  });

  it("codChangeOptions: sentiasa mengandungi baki betul, tiada nilai negatif (RM10–95.50)", () => {
    for (let a = 10; a <= 95.5; a += 0.5) {
      const o = codChangeOptions(a);
      expect(o).toContain(codChange(a));
      expect(o[0]).toBeGreaterThanOrEqual(0);
      expect(new Set(o).size).toBe(3);
    }
  });
});

describe("generateInbound — paket COD", () => {
  // Gulungan setiap paket: destinasi, penerima, berat, isi padu, COD?, [jumlah COD]
  it("gulungan COD < 0.4 → cod; jumlah = 10 + floor(r × 172) × 0.5", () => {
    const deps = testDeps([0.5, 0.5, 0.5, 0.5, 0.3, 0.99, 0.5, 0.5, 0.5, 0.5, 0.7]);
    const { packets } = generateInbound(2, [SHOP], DESK.name, deps, 1000);
    expect(packets[0].paymentMethod).toBe("cod");
    expect(packets[0].codAmount).toBe(95);
    expect(packets[1].paymentMethod).toBe("prepaid");
    expect(packets[1].codAmount).toBe(0);
  });

  it("semua gulungan 0.5 → prabayar (paket sedia ada tidak berubah)", () => {
    const { packets } = generateInbound(3, [SHOP], DESK.name, testDeps([0.5]), 1000);
    for (const p of packets) expect([p.paymentMethod, p.codAmount]).toEqual(["prepaid", 0]);
  });

  it("1000 paket: ~40% COD, jumlah RM10–95.50 dalam gandaan 50 sen", () => {
    let x = 12345;
    const rng = () => {
      x = (x * 16807) % 2147483647;
      return (x - 1) / 2147483646;
    };
    const { packets } = generateInbound(1000, [SHOP], DESK.name, { ...testDeps(), rng }, 1000);
    const cod = packets.filter((p) => p.paymentMethod === "cod");
    expect(cod.length / 1000).toBeGreaterThan(0.33);
    expect(cod.length / 1000).toBeLessThan(0.47);
    for (const p of cod) {
      expect(p.codAmount).toBeGreaterThanOrEqual(10);
      expect(p.codAmount).toBeLessThanOrEqual(95.5);
      expect(Number.isInteger(p.codAmount * 2)).toBe(true);
    }
  });
});

describe("collectCod & completeHandover", () => {
  const cod = () => openAt(withCod(deliveringTo([SHOP]), { 0: 37.5 }), SHOP, 2000);

  it("baki salah → belum dikutip, mesej 'Baki salah — kira semula'", () => {
    const s = collectCod(cod(), 11.5, 2100);
    expect(s.handover?.codCollected).toBeFalsy();
    expect(s.interactionMessage).toBe("Baki salah — kira semula");
  });

  it("baki betul → dikutip, mesej 'COD diterima: RM…'", () => {
    const s = collectCod(cod(), 12.5, 2100);
    expect(s.handover?.codCollected).toBe(true);
    expect(s.interactionMessage).toBe(`COD diterima: ${formatRinggit(37.5)}`);
  });

  it("paket prabayar → collectCod tidak mengubah sesi", () => {
    const s = openAt(deliveringTo([SHOP]), SHOP, 2000);
    expect(collectCod(s, 0, 2100)).toBe(s);
  });

  it("bukti diambil tetapi COD belum dikutip → tidak diserahkan", () => {
    const { result, session } = completeHandover(takeProof(cod(), 2050), 2200, testDeps());
    expect(result.action).toBe("nothing");
    expect(result.message).toBe("Kutip bayaran COD dahulu");
    expect(session.cargo[0].status).toBe("out_for_delivery");
  });

  it("COD dikutip + bukti → dihantar", () => {
    const s = takeProof(collectCod(cod(), 12.5, 2100), 2150);
    const { result, session } = completeHandover(s, 2200, testDeps());
    expect(result.action).toBe("deliver");
    expect(session.cargo[0].status).toBe("delivered");
  });
});

describe("ringkasan manifest: COD disetor", () => {
  it("dihantar COD dijumlahkan; COD gagal (dipulangkan) tidak", () => {
    let s = withCod(deliveringTo([SHOP, INDUSTRI], 1000), { 0: 37.5, 1: 60 });
    s = openAt(s, SHOP, 2000);
    s = completeHandover(takeProof(collectCod(s, 12.5, 2100), 2150), 2200, testDeps()).session;
    s = failHandover(openAt(s, INDUSTRI, 4000), 4000);
    const { session } = interact(s, DESK, 6000, testDeps(), onFoot);
    expect(session.summary?.codCollected).toBe(37.5);
  });

  it("codCollectedTotal: hanya paket delivered + cod", () => {
    const s = withCod(deliveringTo([SHOP, SHOP]), { 0: 10.5, 1: 20 });
    const cargo = [{ ...s.cargo[0], status: "delivered" as const }, s.cargo[1]];
    expect(codCollectedTotal(cargo)).toBe(10.5);
  });

  it("tunai COD bukan pendapatan: wang pemain bertambah dengan ganjaran sahaja", () => {
    useGameStateStore.getState().createNewGame("COD");
    useDeliveryStore.getState().reset();
    useDeliveryStore.setState({ deps: testDeps() });
    useDeliveryStore.setState({ session: { ...withCod(deliveringTo([SHOP]), { 0: 80 }), nearbyZone: SHOP } });
    const before = useGameStateStore.getState().player?.money ?? Number.NaN;
    const store = useDeliveryStore.getState();
    store.interact(2000, onFoot);
    store.collectCod(20, 2100);
    store.takeProof();
    store.confirmHandover(2200);
    const after = useGameStateStore.getState().player?.money ?? Number.NaN;
    expect(useDeliveryStore.getState().session.cargo[0].status).toBe("delivered");
    expect(after - before).toBe(useDeliveryStore.getState().session.tally.earned);
  });
});

describe("simpanan lama tanpa codCollected", () => {
  it("loadSaved: ringkasan tanpa codCollected → 0", async () => {
    useGameStateStore.getState().createNewGame("Lama");
    useDeliveryStore.getState().reset();
    const old = { manifestId: "m", delivered: 1, returned: 0, earned: 5, xp: 30, durationMs: 1000 };
    useDeliveryStore.setState({
      session: { ...useDeliveryStore.getState().session, phase: "complete", summary: old as ManifestSummary },
    });
    const save = JSON.parse(JSON.stringify(buildSave(1000)));
    let stored: unknown = save;
    const backend: SaveBackend = {
      read: async () => stored,
      write: async (d) => {
        stored = d;
      },
      clear: async () => {
        stored = null;
      },
    };
    useDeliveryStore.getState().reset();
    expect(await loadSaved(backend)).toEqual({ ok: true });
    expect(useDeliveryStore.getState().session.summary?.codCollected).toBe(0);
  });
});

describe("UI", () => {
  let container: HTMLDivElement;
  let root: Root;
  const render = (el: React.ReactElement) => act(() => root.render(el));
  const button = (label: string) => container.querySelector<HTMLButtonElement>(`button[aria-label="${label}"]`);
  const byText = (text: string) =>
    [...container.querySelectorAll("button")].find((b) => b.textContent?.trim() === text) ?? null;

  beforeEach(() => {
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    useGameStateStore.getState().createNewGame("UI");
    useDeliveryStore.getState().reset();
    useDeliveryStore.setState({ deps: testDeps() });
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    useDeliveryStore.getState().reset();
  });

  it("HandoverPanel COD: jumlah, wang kertas, 3 butang baki; Serahkan dikunci sehingga baki betul", () => {
    useDeliveryStore.setState({ session: { ...withCod(deliveringTo([SHOP]), { 0: 37.5 }), nearbyZone: SHOP } });
    act(() => {
      useDeliveryStore.getState().interact(2000, onFoot);
    });
    render(<HandoverPanel />);
    const text = () => container.textContent ?? "";
    expect(text()).toContain(`COD ${formatRinggit(37.5)}`);
    expect(text()).toContain(formatRinggit(50));
    for (const v of ["12.50", "13.50", "14.50"]) expect(button(`Baki ${v}`), `Baki ${v}`).not.toBeNull();

    act(() => byText("Ambil bukti")?.click());
    expect(byText("Serahkan paket")?.disabled).toBe(true);

    act(() => button("Baki 13.50")?.click());
    expect(byText("Serahkan paket")?.disabled).toBe(true);
    expect(useDeliveryStore.getState().session.interactionMessage).toBe("Baki salah — kira semula");

    act(() => button("Baki 12.50")?.click());
    expect(button("Baki 12.50")).toBeNull();
    expect(text()).toContain(`COD diterima: ${formatRinggit(37.5)}`);
    expect(byText("Serahkan paket")?.disabled).toBe(false);

    act(() => byText("Serahkan paket")?.click());
    expect(useDeliveryStore.getState().session.cargo[0].status).toBe("delivered");
  });

  it("HandoverPanel prabayar: tiada butang baki, status Prabayar", () => {
    useDeliveryStore.setState({ session: { ...deliveringTo([SHOP]), nearbyZone: SHOP } });
    act(() => {
      useDeliveryStore.getState().interact(2000, onFoot);
    });
    render(<HandoverPanel />);
    expect(container.querySelector('button[aria-label^="Baki"]')).toBeNull();
    expect(container.textContent).toContain("Prabayar");
  });

  it("ManifestSummaryPanel: baris 'COD disetor' dengan jumlah", () => {
    const summary: ManifestSummary = {
      manifestId: "m",
      delivered: 2,
      returned: 0,
      earned: 12,
      xp: 60,
      durationMs: 60_000,
      codCollected: 58.5,
    };
    useDeliveryStore.setState({ session: { ...useDeliveryStore.getState().session, summary } });
    render(<ManifestSummaryPanel />);
    expect(container.textContent).toContain("COD disetor");
    expect(container.textContent).toContain(formatRinggit(58.5));
  });

  it("WarehousePanel: paket COD menunjukkan 'COD RM…'", () => {
    const inbound = generateInbound(1, [SHOP], DESK.name, testDeps([0.5, 0.5, 0.5, 0.5, 0.1, 0.5]), 1000);
    useDeliveryStore.setState({
      session: {
        ...useDeliveryStore.getState().session,
        inbound: inbound.packets,
        targets: inbound.targets,
        panelOpen: true,
      },
    });
    render(<WarehousePanel />);
    expect(inbound.packets[0].codAmount).toBe(53);
    expect(container.textContent).toContain(`COD ${formatRinggit(53)}`);
  });
});

describe("CSS", () => {
  it(".wh-cod__options: 3 lajur sama lebar", () => {
    const body = ruleBody(".wh-cod__options");
    expect(body).toMatch(/display:\s*grid;/);
    expect(body).toMatch(/grid-template-columns:\s*repeat\(3,\s*1fr\);/);
    expect(body).toMatch(/gap:/);
  });

  it("B22: .wh-panel__row ada jarak antara label dan nilai ('Penerima:Aminah')", () => {
    const body = ruleBody(".wh-panel__row");
    expect(body).toMatch(/display:\s*flex;/);
    expect(body).toMatch(/gap:/);
  });
});
