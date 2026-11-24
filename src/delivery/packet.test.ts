import type { PacketStatus } from "@/types/game";
import { describe, expect, it } from "vitest";
import { PACKET_TRANSITIONS, advance, canTransition, createPacket, transition } from "./packet";

const base = () =>
  createPacket({
    id: "p1",
    trackingNumber: "MSK-1",
    senderAddress: "Pejabat Pos Pusat",
    receiverName: "Aminah",
    receiverAddress: "Kedai Runcit",
    areaCode: "perumahan",
    weight: 1,
    volume: 3,
    now: 1000,
  });

const proof = { inOpenManifest: true, hasHandover: true };
const ALL = Object.keys(PACKET_TRANSITIONS) as PacketStatus[];

describe("createPacket", () => {
  it("mula di status received dengan satu entri sejarah", () => {
    const p = base();
    expect(p.status).toBe("received");
    expect(p.history).toEqual([{ status: "received", timestamp: 1000, reason: "Diterima di gudang" }]);
  });
});

describe("transition — setiap pasangan status", () => {
  for (const from of ALL) {
    for (const to of ALL) {
      const allowed = PACKET_TRANSITIONS[from].includes(to);
      it(`${from} → ${to}: ${allowed ? "sah" : "ditolak"}`, () => {
        const p = { ...base(), status: from };
        if (allowed) {
          const next = transition(p, to, "ujian", 2000, proof);
          expect(next.status).toBe(to);
          expect(next.history[next.history.length - 1]).toEqual({ status: to, timestamp: 2000, reason: "ujian" });
          expect(next.updatedAt).toBe(2000);
        } else {
          expect(() => transition(p, to, "ujian", 2000, proof)).toThrow("Peralihan tidak sah");
        }
      });
    }
  }
});

describe("transition — peraturan delivered (seksyen I)", () => {
  const out = () =>
    advance(base(), ["sorting", "ready_to_dispatch", "loaded", "in_transit", "out_for_delivery"], "x", 1);

  it("ditolak tanpa bukti", () => {
    expect(() => transition(out(), "delivered", "x", 2)).toThrow("manifest terbuka");
  });

  it("ditolak tanpa manifest terbuka", () => {
    expect(() => transition(out(), "delivered", "x", 2, { inOpenManifest: false, hasHandover: true })).toThrow();
  });

  it("ditolak tanpa serah terima", () => {
    expect(() => transition(out(), "delivered", "x", 2, { inOpenManifest: true, hasHandover: false })).toThrow();
  });

  it("diterima dengan manifest terbuka dan serah terima", () => {
    expect(transition(out(), "delivered", "x", 2, proof).status).toBe("delivered");
  });

  it("tidak mengubah paket asal", () => {
    const p = out();
    transition(p, "delivered", "x", 2, proof);
    expect(p.status).toBe("out_for_delivery");
  });
});

describe("canTransition", () => {
  it("padan dengan jadual peralihan", () => {
    expect(canTransition("received", "sorting")).toBe(true);
    expect(canTransition("incoming", "delivered")).toBe(false);
    expect(canTransition("cancelled", "received")).toBe(false);
  });
});
