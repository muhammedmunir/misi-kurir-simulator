import { HandoverPanel } from "@/delivery/HandoverPanel";
/**
 * Kontrak Pelan 005 Langkah 5 — pelanggan & serah terima.
 * Ditulis oleh perancang. C9 TIDAK boleh menyunting fail ini.
 */
import { completeHandover, failHandover, returnFailedPackets, takeProof } from "@/delivery/handover";
import { createSession, interact, interactBlocksMotorSwap } from "@/lib/delivery-system";
import { getActionButton, getInteractButtonInfo } from "@/lib/interact-button";
import { useDeliveryStore } from "@/store/delivery";
import { useGameStateStore } from "@/store/gamestate";
import { DESK, INDUSTRI, SHOP, deliveringTo, testDeps } from "@/test/delivery-fixtures";
import type { DeliverySession } from "@/types/delivery";
import { act } from "react";
import { type Root, createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

const onFoot = { onFoot: true };
const riding = { onFoot: false };

function openAt(s: DeliverySession, zone: typeof SHOP, now = 5000): DeliverySession {
  const r = interact(s, zone, now, testDeps(), onFoot);
  expect(r.result.action).toBe("open_handover");
  return r.session;
}

const statusOf = (s: DeliverySession, zone: typeof SHOP) => s.cargo.find((p) => s.targets[p.id] === zone.id)?.status;

describe("interact di alamat — mesti berjalan kaki, buka serah terima", () => {
  it("berjalan kaki + paket untuk alamat ini → open_handover, paket BELUM dihantar", () => {
    const s = deliveringTo([SHOP]);
    const { result, session } = interact(s, SHOP, 5000, testDeps(), onFoot);
    expect(result.action).toBe("open_handover");
    expect(interactBlocksMotorSwap(result.action)).toBe(true);
    const packet = s.cargo[0];
    // Pelan 018 (dikemas kini oleh perancang): mood pelanggan digulung semasa dibuka; rng 0.5 → "home".
    // Medan tambahan Pelan 018 (cth. neighbourAvailable) dibenarkan.
    expect(session.handover).toMatchObject({ packetId: packet.id, zoneId: SHOP.id, proofTaken: false, mood: "home" });
    expect(statusOf(session, SHOP)).toBe("out_for_delivery");
  });

  it("atas motor → nothing (supaya tekanan itu menurunkan pemain), tiada serah terima", () => {
    const { result, session } = interact(deliveringTo([SHOP]), SHOP, 5000, testDeps(), riding);
    expect(result.action).toBe("nothing");
    expect(interactBlocksMotorSwap(result.action)).toBe(false);
    expect(session.handover ?? null).toBeNull();
  });

  it("sesi baharu tiada serah terima", () => {
    expect(createSession().handover).toBeNull();
  });
});

describe("handover — bukti dan serahan", () => {
  it("serah tanpa bukti ditolak; paket kekal out_for_delivery", () => {
    const s = openAt(deliveringTo([SHOP]), SHOP);
    const { result, session } = completeHandover(s, 6000, testDeps());
    expect(result.action).toBe("nothing");
    expect(statusOf(session, SHOP)).toBe("out_for_delivery");
  });

  it("ambil bukti → serah → delivered dengan ganjaran, panel ditutup", () => {
    const s = takeProof(openAt(deliveringTo([SHOP]), SHOP));
    expect(s.handover?.proofTaken).toBe(true);
    const { result, session } = completeHandover(s, 6000, testDeps());
    expect(result.action).toBe("deliver");
    expect(result.reward).toBeGreaterThan(0);
    expect(statusOf(session, SHOP)).toBe("delivered");
    expect(session.handover).toBeNull();
    // Langkah 6: manifest ditutup di gudang, bukan di alamat terakhir.
    expect(session.phase).toBe("returning");
    expect(session.manifest?.status).toBe("open");
  });

  it("alamat tanpa penerima (INDUSTRI): serah ditolak walaupun ada bukti", () => {
    const s = takeProof(openAt(deliveringTo([INDUSTRI]), INDUSTRI));
    const { result, session } = completeHandover(s, 6000, testDeps());
    expect(result.action).toBe("nothing");
    expect(statusOf(session, INDUSTRI)).toBe("out_for_delivery");
  });
});

describe("penerima tiada → failed → pulang ke gudang", () => {
  it("failHandover: paket failed dengan sebab, panel ditutup", () => {
    const s = failHandover(openAt(deliveringTo([INDUSTRI, SHOP]), INDUSTRI), 6000);
    const failed = s.cargo.find((p) => s.targets[p.id] === INDUSTRI.id);
    expect(failed?.status).toBe("failed");
    expect(failed?.history[failed.history.length - 1]).toEqual({
      status: "failed",
      timestamp: 6000,
      reason: "Penerima tiada di rumah",
    });
    expect(s.handover).toBeNull();
    // Masih ada paket ke SHOP
    expect(s.phase).toBe("delivering");
  });

  it("paket terakhir gagal → fasa returning (bukan jalan buntu)", () => {
    const s = failHandover(openAt(deliveringTo([INDUSTRI]), INDUSTRI), 6000);
    expect(s.phase).toBe("returning");
    expect(s.manifest?.status).toBe("open");
  });

  it("hantar satu, gagal satu → returning", () => {
    let s = takeProof(openAt(deliveringTo([SHOP, INDUSTRI]), SHOP));
    s = completeHandover(s, 6000, testDeps()).session;
    expect(s.phase).toBe("delivering");
    s = failHandover(openAt(s, INDUSTRI, 8000), 8000);
    expect(s.phase).toBe("returning");
  });

  it("meja gudang semasa returning → return_packets: failed → returned, manifest ditutup", () => {
    const returning = failHandover(openAt(deliveringTo([INDUSTRI]), INDUSTRI), 6000);
    const { result, session } = interact(returning, DESK, 9000, testDeps(), onFoot);
    expect(result.action).toBe("return_packets");
    expect(statusOf(session, INDUSTRI)).toBe("returned");
    expect(session.manifest?.status).toBe("closed");
    expect(session.phase).toBe("complete");
  });

  it("returnFailedPackets terus (fungsi tulen) memberi hasil yang sama", () => {
    const returning = failHandover(openAt(deliveringTo([INDUSTRI]), INDUSTRI), 6000);
    const s = returnFailedPackets(returning, 9000);
    expect(statusOf(s, INDUSTRI)).toBe("returned");
    expect(s.phase).toBe("complete");
  });
});

describe("butang tindakan", () => {
  it("alamat dengan paket → SERAH PAKET, perlu berjalan kaki", () => {
    const info = getInteractButtonInfo({ ...deliveringTo([SHOP]), nearbyZone: SHOP }, 50_000);
    expect(info).toEqual({ label: "SERAH PAKET", enabled: true, needsOnFoot: true });
  });

  it("atas motor di alamat → TURUN MOTOR / BERHENTI DULU, bukan SERAH PAKET", () => {
    const info = getInteractButtonInfo({ ...deliveringTo([SHOP]), nearbyZone: SHOP }, 50_000);
    expect(getActionButton(info, { onFoot: false, nearMotor: false, speed: 0 }).label).toBe("TURUN MOTOR");
    expect(getActionButton(info, { onFoot: false, nearMotor: false, speed: 5 }).label).toBe("BERHENTI DULU");
    expect(getActionButton(info, { onFoot: true, nearMotor: false, speed: 0 }).label).toBe("SERAH PAKET");
  });

  it("meja gudang semasa returning → PULANGKAN PAKET", () => {
    const returning = failHandover(openAt(deliveringTo([INDUSTRI]), INDUSTRI), 6000);
    expect(getInteractButtonInfo({ ...returning, nearbyZone: DESK }, 50_000)).toEqual({
      label: "PULANGKAN PAKET",
      enabled: true,
    });
  });
});

// ── Stor + panel: laluan yang permainan benar-benar jalankan ─────

describe("HandoverPanel + stor — wang pemain", () => {
  let container: HTMLDivElement;
  let root: Root;
  const store = () => useDeliveryStore.getState();
  const money = () => useGameStateStore.getState().player?.money ?? Number.NaN;
  const text = () => container.textContent ?? "";
  const button = (label: string) =>
    [...container.querySelectorAll("button")].find((b) => b.textContent?.trim() === label) ?? null;
  const click = (label: string) => {
    const b = button(label);
    if (!b) throw new Error(`butang "${label}" tiada; teks panel: ${text()}`);
    act(() => b.click());
  };

  beforeEach(() => {
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    useGameStateStore.getState().createNewGame("Ujian");
    useDeliveryStore.setState({ deps: testDeps() });
    store().reset();
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    store().reset();
  });

  it("tiada serah terima → panel tidak dirender", () => {
    act(() => root.render(<HandoverPanel />));
    expect(text()).toBe("");
  });

  it("serah melalui panel: nama, penjejakan, bukti, kemudian wang bertambah sekali", () => {
    useDeliveryStore.setState({ session: { ...deliveringTo([SHOP]), nearbyZone: SHOP } });
    act(() => {
      store().interact(5000, onFoot);
    });
    act(() => root.render(<HandoverPanel />));
    const packet = store().session.cargo[0];
    expect(text()).toContain(packet.receiverName);
    expect(text()).toContain(packet.trackingNumber);
    expect(button("Serahkan paket")?.disabled).toBe(true);

    const before = money();
    click("Ambil bukti");
    expect(button("Serahkan paket")?.disabled).toBe(false);
    click("Serahkan paket");
    expect(money()).toBeGreaterThan(before);
    expect(store().session.cargo[0].status).toBe("delivered");
    expect(text()).toBe("");
  });

  it("alamat tanpa penerima: hanya Penerima tiada; paket failed, wang tidak berubah", () => {
    useDeliveryStore.setState({ session: { ...deliveringTo([INDUSTRI]), nearbyZone: INDUSTRI } });
    act(() => {
      store().interact(5000, onFoot);
    });
    act(() => root.render(<HandoverPanel />));
    expect(button("Serahkan paket")).toBeNull();
    const before = money();
    click("Penerima tiada");
    expect(store().session.cargo[0].status).toBe("failed");
    expect(store().session.phase).toBe("returning");
    expect(money()).toBe(before);
  });

  it("Batal menutup panel tanpa mengubah paket", () => {
    useDeliveryStore.setState({ session: { ...deliveringTo([SHOP]), nearbyZone: SHOP } });
    act(() => {
      store().interact(5000, onFoot);
    });
    act(() => root.render(<HandoverPanel />));
    click("Batal");
    expect(store().session.handover).toBeNull();
    expect(store().session.cargo[0].status).toBe("out_for_delivery");
    expect(text()).toBe("");
  });

  it("berjalan pergi dari alamat menutup serah terima", () => {
    useDeliveryStore.setState({ session: { ...deliveringTo([SHOP]), nearbyZone: SHOP } });
    store().interact(5000, onFoot);
    expect(store().session.handover).not.toBeNull();
    store().setNearbyZone(null);
    expect(store().session.handover).toBeNull();
  });
});
