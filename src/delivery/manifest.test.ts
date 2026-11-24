import type { Manifest, Packet } from "@/types/game";
import { describe, expect, it } from "vitest";
import { closeManifest, createManifest, isCarrying, loadPacket } from "./manifest";
import { advance, createPacket, transition } from "./packet";

const limits = { maxVolume: 10, maxWeight: 5 };
const proof = { inOpenManifest: true, hasHandover: true };

function raw(id: string, weight = 1, volume = 3): Packet {
  return createPacket({
    id,
    trackingNumber: `MSK-${id}`,
    senderAddress: "Gudang",
    receiverName: "Siti",
    receiverAddress: "Rumah",
    areaCode: "perumahan",
    weight,
    volume,
    now: 0,
  });
}

const ready = (id: string, weight = 1, volume = 3) =>
  advance(raw(id, weight, volume), ["sorting", "ready_to_dispatch"], "sortir", 0);

const out = (p: Packet) => advance(p, ["in_transit", "out_for_delivery"], "jalan", 10);

function mustLoad(m: Manifest, p: Packet) {
  const r = loadPacket(m, p, limits, 10);
  if (!r.ok) throw new Error(r.error);
  return r;
}

describe("loadPacket — kapasiti dan berat (seksyen H.3)", () => {
  it("muat paket sedia: status loaded, jumlah dikemas kini", () => {
    const r = mustLoad(createManifest("m1", 0), ready("a", 2, 3));
    expect(r.packet.status).toBe("loaded");
    expect(r.manifest.packets).toEqual(["a"]);
    expect(r.manifest.totalWeight).toBe(2);
    expect(r.manifest.totalVolume).toBe(3);
    expect(r.manifest.totalPackets).toBe(1);
  });

  it("tolak jika melebihi berat; paket tidak dianggap dibawa", () => {
    const first = mustLoad(createManifest("m1", 0), ready("a", 4));
    expect(loadPacket(first.manifest, ready("b", 2), limits, 10)).toEqual({ ok: false, error: "over_weight" });
    expect(isCarrying(first.manifest, "b")).toBe(false);
  });

  it("tolak jika melebihi isipadu", () => {
    let m = createManifest("m1", 0);
    for (const id of ["a", "b", "c"]) m = mustLoad(m, ready(id)).manifest;
    expect(loadPacket(m, ready("d"), limits, 10)).toEqual({ ok: false, error: "over_volume" });
  });

  it("muat tepat pada had dibenarkan", () => {
    expect(loadPacket(createManifest("m1", 0), ready("a", 5, 10), limits, 10).ok).toBe(true);
  });

  it("tolak paket yang belum disortir", () => {
    expect(loadPacket(createManifest("m1", 0), raw("x"), limits, 10)).toEqual({ ok: false, error: "not_ready" });
  });

  it("tolak muat dua kali", () => {
    const r = mustLoad(createManifest("m1", 0), ready("a"));
    expect(loadPacket(r.manifest, ready("a"), limits, 10)).toEqual({ ok: false, error: "already_loaded" });
  });

  it("tolak manifest yang sudah ditutup", () => {
    const closed: Manifest = { ...createManifest("m1", 0), status: "closed" };
    expect(loadPacket(closed, ready("a"), limits, 10)).toEqual({ ok: false, error: "manifest_closed" });
  });
});

describe("closeManifest", () => {
  it("tolak jika ada paket belum selesai", () => {
    const r = mustLoad(createManifest("m1", 0), ready("a"));
    expect(closeManifest(r.manifest, [out(r.packet)], 20)).toEqual({ ok: false, error: "unresolved" });
  });

  it("tolak jika paket failed belum dipulangkan", () => {
    const r = mustLoad(createManifest("m1", 0), ready("a"));
    const failed = transition(out(r.packet), "failed", "tiada orang", 20);
    expect(closeManifest(r.manifest, [failed], 30).ok).toBe(false);
  });

  it("tutup apabila semua delivered atau returned", () => {
    const a = mustLoad(createManifest("m1", 0), ready("a"));
    const b = mustLoad(a.manifest, ready("b"));
    const delivered = transition(out(a.packet), "delivered", "serah", 20, proof);
    const returned = transition(transition(out(b.packet), "failed", "tiada", 20), "returned", "pulang", 30);
    const r = closeManifest(b.manifest, [delivered, returned], 40);
    expect(r).toEqual({ ok: true, manifest: { ...b.manifest, status: "closed", closedAt: 40 } });
  });

  it("tolak tutup kali kedua", () => {
    const closed: Manifest = { ...createManifest("m1", 0), status: "closed" };
    expect(closeManifest(closed, [], 1)).toEqual({ ok: false, error: "already_closed" });
  });

  it("isCarrying palsu selepas manifest ditutup", () => {
    const r = mustLoad(createManifest("m1", 0), ready("a"));
    expect(isCarrying(r.manifest, "a")).toBe(true);
    expect(isCarrying({ ...r.manifest, status: "closed" }, "a")).toBe(false);
  });
});
