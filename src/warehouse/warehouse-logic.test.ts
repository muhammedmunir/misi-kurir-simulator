import { DELIVERY_ZONES, STARTER_CARGO, createSession } from "@/lib/delivery-system";
import { testDeps } from "@/test/delivery-fixtures";
import type { DeliverySession } from "@/types/delivery";
import { describe, expect, it } from "vitest";
import { cargoUsage, dispatch, generateInbound, loadOntoVehicle, scanPacket } from "./warehouse-logic";

const DESTS = DELIVERY_ZONES.filter((z) => z.type === "delivery");
const limits = STARTER_CARGO;

function withInbound(weights: number[], volume = 2): DeliverySession {
  const { packets, targets } = generateInbound(weights.length, DESTS, "Gudang", testDeps(), 0);
  return {
    ...createSession(),
    inbound: packets.map((p, i) => ({ ...p, weight: weights[i], volume })),
    targets,
  };
}

function ok(o: { ok: true; session: DeliverySession } | { ok: false; error: string }): DeliverySession {
  if (!o.ok) throw new Error(o.error);
  return o.session;
}

describe("generateInbound", () => {
  it("setiap paket received, beralamat ke zon penghantaran", () => {
    const { packets, targets } = generateInbound(6, DESTS, "Gudang", testDeps([0, 0.4, 0.99]), 0);
    expect(packets).toHaveLength(6);
    for (const p of packets) {
      expect(p.status).toBe("received");
      const zone = DESTS.find((z) => z.id === targets[p.id]);
      expect(zone?.name).toBe(p.receiverAddress);
    }
  });
});

describe("scanPacket", () => {
  it("received → sorting → ready_to_dispatch, sejarah lengkap", () => {
    const s = withInbound([1]);
    const id = s.inbound[0].id;
    const p = ok(scanPacket(s, id, 50)).inbound[0];
    expect(p.status).toBe("ready_to_dispatch");
    expect(p.history.map((h) => h.status)).toEqual(["received", "sorting", "ready_to_dispatch"]);
  });

  it("tolak imbas kali kedua", () => {
    const s = withInbound([1]);
    const id = s.inbound[0].id;
    expect(scanPacket(ok(scanPacket(s, id, 1)), id, 2)).toEqual({ ok: false, error: "Paket sudah diimbas" });
  });
});

describe("loadOntoVehicle", () => {
  const scanAll = (s: DeliverySession) => s.inbound.reduce((acc, p) => ok(scanPacket(acc, p.id, 1)), s);

  it("muat pertama membuka manifest; paket pindah dari gudang ke motor", () => {
    const s = scanAll(withInbound([1, 2]));
    const id = s.inbound[0].id;
    const after = ok(loadOntoVehicle(s, id, limits, testDeps().createId, 5));
    expect(after.phase).toBe("loading");
    expect(after.manifest?.status).toBe("open");
    expect(after.manifest?.packets).toEqual([id]);
    expect(after.cargo.map((p) => [p.id, p.status])).toEqual([[id, "loaded"]]);
    expect(after.inbound.map((p) => p.id)).not.toContain(id);
  });

  it("paket melebihi berat ditolak dan kekal di gudang", () => {
    let s = scanAll(withInbound([10, 6]));
    s = ok(loadOntoVehicle(s, s.inbound[0].id, limits, testDeps().createId, 5));
    const heavy = s.inbound[0].id;
    expect(loadOntoVehicle(s, heavy, limits, testDeps().createId, 6)).toEqual({
      ok: false,
      error: "Melebihi had berat motor",
    });
    expect(s.inbound.map((p) => p.id)).toContain(heavy);
  });

  it("tolak paket belum diimbas", () => {
    const s = withInbound([1]);
    expect(loadOntoVehicle(s, s.inbound[0].id, limits, testDeps().createId, 1)).toEqual({
      ok: false,
      error: "Imbas paket dahulu",
    });
  });

  it("tolak memuat semasa penghantaran", () => {
    const s = { ...scanAll(withInbound([1])), phase: "delivering" as const };
    expect(loadOntoVehicle(s, s.inbound[0].id, limits, testDeps().createId, 1).ok).toBe(false);
  });

  it("penunjuk kapasiti", () => {
    let s = scanAll(withInbound([1.25, 2.5], 3));
    for (const id of s.inbound.map((p) => p.id)) s = ok(loadOntoVehicle(s, id, limits, testDeps().createId, 1));
    expect(cargoUsage(s, limits)).toEqual({ packets: 2, weight: 3.8, maxWeight: 15, volume: 6, maxVolume: 20 });
  });
});

describe("dispatch", () => {
  it("tolak tanpa kargo", () => {
    expect(dispatch(createSession(), 1).ok).toBe(false);
  });

  it("kargo out_for_delivery, panel ditutup, fasa delivering", () => {
    let s = withInbound([1]);
    const id = s.inbound[0].id;
    s = ok(scanPacket(s, id, 1));
    s = ok(loadOntoVehicle({ ...s, panelOpen: true }, id, limits, testDeps().createId, 2));
    const after = ok(dispatch(s, 3));
    expect(after.phase).toBe("delivering");
    expect(after.panelOpen).toBe(false);
    expect(after.cargo[0].status).toBe("out_for_delivery");
  });
});
